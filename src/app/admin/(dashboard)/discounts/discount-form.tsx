"use client";

import { useActionState, useState } from "react";

import { createDiscount, type DiscountFormState } from "./actions";

export type PickerProduct = { slug: string; brand: string; model: string };

const initialState: DiscountFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

export function DiscountForm({ products }: { products: PickerProduct[] }) {
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [selected, setSelected] = useState<PickerProduct[]>([]);
  const [search, setSearch] = useState("");
  const [state, formAction, pending] = useActionState(createDiscount, initialState);

  const toggleProduct = (product: PickerProduct) => {
    setSelected((prev) =>
      prev.some((p) => p.slug === product.slug)
        ? prev.filter((p) => p.slug !== product.slug)
        : [...prev, product],
    );
  };

  const matchesSearch = (product: PickerProduct) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return false;
    return (
      product.brand.toLowerCase().includes(needle) ||
      product.model.toLowerCase().includes(needle) ||
      product.slug.includes(needle.replace(/\s+/g, "-"))
    );
  };
  const searchResults = search.trim() ? products.filter(matchesSearch).slice(0, 6) : [];

  return (
    <form action={formAction} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">New discount code</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-zinc-700">Code</label>
          <input
            id="code"
            name="code"
            required
            maxLength={40}
            placeholder="SPRING10"
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-zinc-700">Type</label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as "percent" | "fixed")}
            className={inputClass}
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </div>
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-zinc-700">
            {type === "percent" ? "Percent (1-100)" : "Amount (USD)"}
          </label>
          <input
            id="value"
            name="value"
            type="number"
            step={type === "percent" ? "1" : "0.01"}
            min="0"
            required
            placeholder={type === "percent" ? "10" : "25.00"}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="minSubtotal" className="block text-sm font-medium text-zinc-700">Minimum order (USD)</label>
          <input id="minSubtotal" name="minSubtotal" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
        </div>
        <div>
          <label htmlFor="maxRedemptions" className="block text-sm font-medium text-zinc-700">Usage limit</label>
          <input id="maxRedemptions" name="maxRedemptions" type="number" min="1" step="1" placeholder="Unlimited" className={inputClass} />
        </div>
        <div>
          <label htmlFor="expiresAt" className="block text-sm font-medium text-zinc-700">Expires on</label>
          <input id="expiresAt" name="expiresAt" type="date" className={inputClass} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-zinc-700">Applies to</label>
          <p className="mt-1 text-xs text-zinc-500">
            Leave empty for the whole order, or pick specific products — the discount then applies only to those items.
          </p>
          <input type="hidden" name="productSlugs" value={selected.map((p) => p.slug).join(",")} />
          {selected.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.map((product) => (
                <span
                  key={product.slug}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                >
                  {product.brand} {product.model}
                  <button
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className="text-zinc-400 hover:text-white"
                    aria-label={`Remove ${product.model}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="relative mt-2">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products to add…"
              className="block w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
            {searchResults.length > 0 ? (
              <ul className="absolute z-10 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                {searchResults.map((product) => (
                  <li key={product.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        toggleProduct(product);
                        setSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    >
                      <span className="font-medium text-zinc-900">{product.brand}</span>{" "}
                      <span className="text-zinc-500">{product.model}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create code"}
      </button>
    </form>
  );
}
