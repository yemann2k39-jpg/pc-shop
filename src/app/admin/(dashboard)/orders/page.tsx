import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatPrice } from "@/lib/format";

import { STATUS_BADGES } from "../../_components/badges";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const rows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(PER_PAGE + 1)
    .offset((page - 1) * PER_PAGE);
  const hasMore = rows.length > PER_PAGE;
  const items = rows.slice(0, PER_PAGE);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Orders</h1>
        <p className="mt-1 text-sm text-zinc-500">Latest first, {PER_PAGE} per page.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <th className="px-5 py-3">Order</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((order) => (
              <tr key={order.orderNumber} className="hover:bg-zinc-50">
                <td className="px-5 py-3 font-mono text-xs text-zinc-700">{order.orderNumber}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-zinc-900">{order.customerName}</p>
                  <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                </td>
                <td className="px-3 py-3 text-zinc-600">
                  {order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-3 py-3 font-medium text-zinc-900">{formatPrice(order.subtotalCents)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGES[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No orders yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <nav className="mt-5 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link href={`/admin/orders?page=${page - 1}`} className="font-medium text-zinc-600 hover:text-zinc-900">
            ← Previous
          </Link>
        ) : <span />}
        {hasMore ? (
          <Link href={`/admin/orders?page=${page + 1}`} className="font-medium text-zinc-600 hover:text-zinc-900">
            Next →
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
