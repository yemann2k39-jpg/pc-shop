import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { orders, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { formatPrice } from "@/lib/format";

import { setOrderStatus } from "../actions";
import { STATUS_BADGES } from "../../../_components/badges";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!order) notFound();

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-sm text-zinc-500 hover:text-zinc-900">← Orders</Link>
          <h1 className="mt-2 flex items-center gap-3 font-mono text-2xl font-bold tracking-tight text-zinc-900">
            {order.orderNumber}
            <span className={`inline-flex rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ring-1 ring-inset ${STATUS_BADGES[order.status]}`}>
              {order.status}
            </span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Placed {order.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ORDER_STATUSES.filter((status) => status !== order.status).map((status) => (
            <form
              key={status}
              action={async () => {
                "use server";
                await setOrderStatus(order.orderNumber, status);
              }}
            >
              <button
                type="submit"
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  status === "cancelled"
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : status === "paid"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Mark {status}
              </button>
            </form>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
          <h2 className="border-b border-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-900">
            Items ({order.items.length})
          </h2>
          <ul className="divide-y divide-zinc-100">
            {order.items.map((item) => (
              <li key={item.slug} className="flex items-center gap-4 px-5 py-3">
                <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-100">
                  <Image src={item.imageUrl} alt="" width={64} height={44} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <Link href={`/product/${item.slug}`} className="font-medium text-zinc-900 hover:underline">
                    {item.brand} {item.model}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {formatPrice(item.unitPriceCents)} × {item.qty}
                  </p>
                </div>
                <p className="font-medium text-zinc-900">{formatPrice(item.unitPriceCents * item.qty)}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
            <span className="text-sm font-semibold text-zinc-900">Total</span>
            <span className="text-lg font-bold text-zinc-900">{formatPrice(order.subtotalCents)}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Customer</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Name</dt>
              <dd className="font-medium text-zinc-900">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Email</dt>
              <dd className="text-zinc-900">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Shipping address</dt>
              <dd className="text-zinc-900">
                {order.shippingAddress}<br />
                {order.shippingCity}, {order.shippingPostalCode}<br />
                {order.shippingCountry}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Payment session</dt>
              <dd className="break-all font-mono text-xs text-zinc-600">
                {order.paymentSessionId ?? "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
