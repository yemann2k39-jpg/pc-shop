import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CATEGORIES, getCategory } from "@/lib/catalog";
import { formatPrice, isOnSale, STOCK_LABELS } from "@/lib/format";
import { listProducts } from "@/lib/products";
import { STOCK_STATUSES, type StockStatus } from "@/db/schema";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

const STOCK_BADGES: Record<StockStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  low_stock: "bg-amber-50 text-amber-700 ring-amber-200",
  out_of_stock: "bg-red-50 text-red-700 ring-red-200",
};

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const status = STOCK_STATUSES.includes(params.status as StockStatus)
    ? (params.status as StockStatus)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listProducts({
    query: q || undefined,
    category: category || undefined,
    stockStatus: status,
    page,
    perPage: PER_PAGE,
    sort: "name",
  });

  const qs = (overrides: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q, category, status, page, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "") sp.set(key, String(value));
    }
    return `/admin/products?${sp.toString()}`;
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {result.total} product{result.total === 1 ? "" : "s"} in the catalog
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          + New product
        </Link>
      </header>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="block text-xs font-medium text-zinc-500">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Brand or model…"
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-xs font-medium text-zinc-500">Category</label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="mt-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-zinc-500">Stock</label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
          >
            <option value="">Any status</option>
            {STOCK_STATUSES.map((s) => (
              <option key={s} value={s}>{STOCK_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Filter
        </button>
        <Link href="/admin/products" className="px-2 py-2 text-sm text-zinc-500 hover:text-zinc-900">
          Reset
        </Link>
      </form>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <th className="px-5 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {result.items.map((product) => (
              <tr key={product.slug} className="hover:bg-zinc-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-100 bg-white">
                      <Image src={product.imageUrl} alt="" width={56} height={42} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">{product.brand}</p>
                      <p className="text-zinc-500">{product.model}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-zinc-600">{getCategory(product.category)?.name ?? product.category}</td>
                <td className="px-3 py-3">
                  {isOnSale(product) ? (
                    <span className="inline-flex items-baseline gap-1.5">
                      <span className="font-semibold text-red-600">{formatPrice(product.priceCents)}</span>
                      <span className="text-xs text-zinc-400 line-through">{formatPrice(product.compareAtCents)}</span>
                    </span>
                  ) : (
                    <span className="font-medium text-zinc-900">{formatPrice(product.priceCents)}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STOCK_BADGES[product.stockStatus]}`}>
                    {STOCK_LABELS[product.stockStatus]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/products/${product.slug}/edit`}
                    className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No products match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {result.pageCount > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={qs({ page: page - 1 })} className="font-medium text-zinc-600 hover:text-zinc-900">← Previous</Link>
          ) : <span />}
          <span className="text-zinc-500">Page {result.page} of {result.pageCount}</span>
          {page < result.pageCount ? (
            <Link href={qs({ page: page + 1 })} className="font-medium text-zinc-600 hover:text-zinc-900">Next →</Link>
          ) : <span />}
        </nav>
      ) : null}
    </div>
  );
}
