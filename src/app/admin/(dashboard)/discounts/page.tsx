import { asc, desc } from "drizzle-orm";
import type { Metadata } from "next";

import { db } from "@/db";
import { discounts, products, type Discount } from "@/db/schema";
import { formatPrice } from "@/lib/format";

import { setDiscountActive } from "./actions";
import { DiscountForm } from "./discount-form";

export const metadata = { title: "Discounts" };
export const dynamic = "force-dynamic";

function valueLabel(discount: Discount): string {
  return discount.type === "percent"
    ? `${discount.value}% off`
    : `${formatPrice(discount.value)} off`;
}

function conditions(discount: Discount): string[] {
  const out: string[] = [];
  if (discount.productSlugs.length > 0) {
    out.push(`${discount.productSlugs.length} product${discount.productSlugs.length === 1 ? "" : "s"} only`);
  }
  if (discount.minSubtotalCents > 0) {
    out.push(`min. order ${formatPrice(discount.minSubtotalCents)}`);
  }
  if (discount.maxRedemptions !== null) {
    out.push(`${discount.timesUsed}/${discount.maxRedemptions} used`);
  } else if (discount.timesUsed > 0) {
    out.push(`${discount.timesUsed} used`);
  }
  if (discount.expiresAt) {
    out.push(`expires ${discount.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
  }
  return out;
}

export default async function AdminDiscountsPage() {
  const [rows, catalog] = await Promise.all([
    db.select().from(discounts).orderBy(desc(discounts.createdAt)),
    db
      .select({ slug: products.slug, brand: products.brand, model: products.model })
      .from(products)
      .orderBy(asc(products.brand), asc(products.model)),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Discounts & promotions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Codes are applied at checkout and validated server-side on every order. Scope codes to specific products or leave them store-wide.
        </p>
      </header>

      <DiscountForm products={catalog} />

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <th className="px-5 py-3">Code</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Conditions</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((discount) => (
              <tr key={discount.code} className="hover:bg-zinc-50">
                <td className="px-5 py-3 font-mono font-semibold text-zinc-900">{discount.code}</td>
                <td className="px-3 py-3 text-zinc-900">{valueLabel(discount)}</td>
                <td className="px-3 py-3 text-xs text-zinc-500">
                  {conditions(discount).join(" · ") || "No restrictions"}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      discount.active
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-zinc-100 text-zinc-500 ring-zinc-200"
                    }`}
                  >
                    {discount.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <form
                    action={async () => {
                      "use server";
                      await setDiscountActive(discount.code, !discount.active);
                    }}
                  >
                    <button
                      type="submit"
                      className={`text-xs font-semibold ${
                        discount.active ? "text-red-600 hover:text-red-800" : "text-emerald-600 hover:text-emerald-800"
                      }`}
                    >
                      {discount.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No discount codes yet — create one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
