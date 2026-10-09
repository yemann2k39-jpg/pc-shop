import { count, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { builds, orders, products } from "@/db/schema";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [revenueRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${orders.subtotalCents} - ${orders.discountCents}), 0)`,
      count: count(),
    })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const statusRows = await db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .groupBy(orders.status);
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const totalOrders = statusRows.reduce((acc, r) => acc + r.count, 0);

  const [buildCount] = await db.select({ count: count() }).from(builds);
  const [productCount] = await db.select({ count: count() }).from(products);

  const stockAlerts = await db
    .select({
      slug: products.slug,
      brand: products.brand,
      model: products.model,
      stockStatus: products.stockStatus,
    })
    .from(products)
    .where(inArray(products.stockStatus, ["low_stock", "out_of_stock"]))
    .orderBy(products.stockStatus, products.brand)
    .limit(8);

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(6);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Shop health at a glance.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue (paid)"
          value={formatPrice(Number(revenueRow?.total ?? 0))}
          hint={`${revenueRow?.count ?? 0} paid order${(revenueRow?.count ?? 0) === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Orders"
          value={String(totalOrders)}
          hint={`${statusCounts.pending ?? 0} pending · ${statusCounts.paid ?? 0} paid · ${statusCounts.cancelled ?? 0} cancelled`}
        />
        <StatCard
          label="Products"
          value={String(productCount?.count ?? 0)}
          hint={`${stockAlerts.length} need stock attention`}
        />
        <StatCard label="Saved builds" value={String(buildCount?.count ?? 0)} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100">
                {recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">{order.orderNumber}</td>
                    <td className="px-3 py-3 text-zinc-900">{order.customerName}</td>
                    <td className="px-3 py-3 font-medium text-zinc-900">{formatPrice(order.subtotalCents)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Stock alerts</h2>
            <Link href="/admin/products" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
              Manage →
            </Link>
          </div>
          {stockAlerts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">All products are in stock. 🎉</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {stockAlerts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/admin/products/${p.slug}/edit`}
                    className="flex items-center justify-between px-5 py-3 text-sm hover:bg-zinc-50"
                  >
                    <span className="text-zinc-900">
                      {p.brand} <span className="text-zinc-500">{p.model}</span>
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        p.stockStatus === "out_of_stock" ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {p.stockStatus === "out_of_stock" ? "Out of stock" : "Low stock"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
