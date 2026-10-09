import Stripe from "stripe";

import type { PaymentProvider } from "./types";

export function createStripeProvider(secretKey: string): PaymentProvider {
  const stripe = new Stripe(secretKey);
  return {
    name: "stripe",

    async createCheckout({ order, successUrl, cancelUrl }) {
      // Apply the order's discount (validated at checkout time) as a
      // one-off coupon so the charged amount matches the order total.
      const discounts =
        order.discountCents > 0
          ? [
              {
                coupon: (
                  await stripe.coupons.create({
                    amount_off: order.discountCents,
                    currency: "usd",
                    duration: "once",
                    name: order.discountCode ?? "Discount",
                  })
                ).id,
              },
            ]
          : undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: order.items.map((item) => ({
          quantity: item.qty,
          price_data: {
            currency: "usd",
            unit_amount: item.unitPriceCents,
            product_data: { name: `${item.brand} ${item.model}` },
          },
        })),
        discounts,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { orderNumber: order.orderNumber },
      });
      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL");
      }
      return { url: session.url, sessionId: session.id };
    },

    async isSessionPaid(sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session.payment_status === "paid";
    },
  };
}
