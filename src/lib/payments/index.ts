import { createMinipayProvider } from "./minipay";
import { createMockProvider } from "./mock";
import { createStripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export type { CheckoutSession, PaymentProvider } from "./types";

/**
 * Returns the configured payment provider: MiniPay when MINIPAY_API_KEY is
 * set, else Stripe when STRIPE_SECRET_KEY is set, otherwise the local mock
 * gateway (so the shop is fully testable without external accounts).
 */
export function getPaymentProvider(): PaymentProvider {
  const minipayKey = process.env.MINIPAY_API_KEY;
  if (minipayKey) {
    const baseUrl = process.env.MINIPAY_BASE_URL ?? "http://localhost:3000";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
    return createMinipayProvider(minipayKey, baseUrl, appUrl);
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey) return createStripeProvider(secretKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return createMockProvider(appUrl);
}
