import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { formatPrice } from "@/lib/format";
import { getOrderByNumber, transitionPendingOrder } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

type OrderPageProps = PageProps<"/order/[orderNumber]">;

export const metadata: Metadata = { title: "Order confirmation" };

const STATUS_BADGES: Record<string, string> = {
  paid: "border-status-success/25 bg-status-success/10 text-status-success",
  pending: "border-status-warning/25 bg-status-warning/10 text-status-warning",
  cancelled: "border-line bg-raised text-ink-dim",
};

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { orderNumber } = await params;
  const query = await searchParams;

  let order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  // Returning from the hosted payment page: verify the session server-side
  // before trusting anything.
  if (order.status === "pending" && order.paymentSessionId) {
    try {
      const paid = await getPaymentProvider().isSessionPaid(order.paymentSessionId);
      if (paid) {
        await transitionPendingOrder(order.orderNumber, "paid");
        order = { ...order, status: "paid" };
      }
    } catch (error) {
      console.error("Payment verification failed:", error);
    }
  }

  // Only clear the cart when the visitor just came back from paying — not
  // when re-opening an old confirmation link later.
  const justPaid =
    order.status === "paid" &&
    (typeof query.session_id === "string" || query.paid === "1");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      {justPaid ? <ClearCartOnMount /> : null}

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              Order
            </p>
            <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight text-ink">
              {order.orderNumber}
            </h1>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGES[order.status] ?? STATUS_BADGES.pending}`}
          >
            {order.status === "paid"
              ? "Payment confirmed"
              : order.status === "cancelled"
                ? "Payment failed"
                : "Awaiting payment"}
          </span>
        </div>

        {order.status === "paid" ? (
          <p className="mt-3 rounded-md border border-status-success/25 bg-status-success/10 px-3 py-2 text-sm text-status-success">
            Thank you! Your order has been received. A confirmation would be
            emailed to {order.customerEmail} in a real shop.
          </p>
        ) : null}
        {order.status === "cancelled" ? (
          <p className="mt-3 rounded-md border border-status-danger/25 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
            The payment was not completed and the order was cancelled. You can
            return to the <Link href="/cart" className="underline">cart</Link> and
            try again.
          </p>
        ) : null}
        {order.status === "pending" ? (
          <p className="mt-3 rounded-md border border-status-warning/25 bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
            We have not received your payment yet. If you already paid, refresh
            this page in a moment, or{" "}
            <Link href="/cart" className="underline">
              return to the cart
            </Link>
            .
          </p>
        ) : null}

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li key={item.slug} className="flex items-center gap-3 py-3">
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-raised">
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium text-ink">
                  {item.brand} {item.model}
                </p>
                <p className="text-xs text-ink-faint">
                  {item.qty} × {formatPrice(item.unitPriceCents)}
                </p>
              </div>
              <p className="text-sm font-semibold text-ink">
                {formatPrice(item.unitPriceCents * item.qty)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between text-base font-bold text-ink">
          <span>Total</span>
          <span>{formatPrice(order.subtotalCents)}</span>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-raised p-3 text-sm">
          <p className="font-medium text-ink-dim">Shipping to</p>
          <p className="mt-1 text-ink-dim">
            {order.customerName}
            <br />
            {order.shippingAddress}
            <br />
            {order.shippingPostalCode} {order.shippingCity},{" "}
            {order.shippingCountry}
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong/90"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
