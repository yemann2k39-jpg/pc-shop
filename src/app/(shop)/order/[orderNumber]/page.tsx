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
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-zinc-200 bg-zinc-100 text-zinc-500",
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

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Order
            </p>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
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
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Thank you! Your order has been received. A confirmation would be
            emailed to {order.customerEmail} in a real shop.
          </p>
        ) : null}
        {order.status === "cancelled" ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            The payment was not completed and the order was cancelled. You can
            return to the <Link href="/cart" className="underline">cart</Link> and
            try again.
          </p>
        ) : null}
        {order.status === "pending" ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            We have not received your payment yet. If you already paid, refresh
            this page in a moment, or{" "}
            <Link href="/cart" className="underline">
              return to the cart
            </Link>
            .
          </p>
        ) : null}

        <ul className="mt-6 divide-y divide-zinc-100 border-y border-zinc-100">
          {order.items.map((item) => (
            <li key={item.slug} className="flex items-center gap-3 py-3">
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-50">
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
                <p className="truncate font-medium text-zinc-900">
                  {item.brand} {item.model}
                </p>
                <p className="text-xs text-zinc-500">
                  {item.qty} × {formatPrice(item.unitPriceCents)}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {formatPrice(item.unitPriceCents * item.qty)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotalCents)}</span>
          </div>
          {order.discountCents > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>Discount {order.discountCode ? `(${order.discountCode})` : ""}</span>
              <span>−{formatPrice(order.discountCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(order.subtotalCents - order.discountCents)}</span>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-medium text-zinc-700">Shipping to</p>
          <p className="mt-1 text-zinc-600">
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
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
