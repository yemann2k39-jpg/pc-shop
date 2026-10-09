"use client";

import { useActionState, useState } from "react";

import {
  SPEC_SUGGESTIONS,
  specFieldsForCategory,
  type AdminSpecField,
} from "@/lib/admin-spec-fields";
import { CATEGORIES, getCategory } from "@/lib/catalog";
import { STOCK_LABELS } from "@/lib/format";
import { STOCK_STATUSES, type Product, type SpecValue } from "@/db/schema";

import { createProduct, updateProduct, type ProductFormState } from "./actions";

const ACCENTS = ["#1d4ed8", "#6d28d9", "#0e7490", "#b45309", "#0f766e", "#c2410c", "#be123c", "#475569"];

const initialState: ProductFormState = {};

function specToInputValue(field: AdminSpecField, value: SpecValue | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

export function ProductForm({ product }: { product?: Product }) {
  const [category, setCategory] = useState(product?.category ?? "cpu");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [model, setModel] = useState(product?.model ?? "");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [state, formAction, pending] = useActionState(
    product ? updateProduct : createProduct,
    initialState,
  );

  const fields = specFieldsForCategory(category);
  const previewSrc = `/api/admin/product-preview?category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand || "Brand")}&model=${encodeURIComponent(model || "Model")}&accent=${encodeURIComponent(accent)}`;

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {product ? <input type="hidden" name="originalSlug" value={product.slug} /> : null}
      <div className="space-y-5 lg:col-span-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Basics</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-zinc-700">Category</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={Boolean(product)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              {product ? (
                <p className="mt-1 text-xs text-zinc-400">Category can&apos;t be changed after creation.</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="stockStatus" className="block text-sm font-medium text-zinc-700">Stock status</label>
              <select id="stockStatus" name="stockStatus" defaultValue={product?.stockStatus ?? "in_stock"} className={inputClass}>
                {STOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>{STOCK_LABELS[status]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-zinc-700">Brand</label>
              <input id="brand" name="brand" required maxLength={120} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="AMD" className={inputClass} />
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-zinc-700">Model</label>
              <input id="model" name="model" required maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ryzen 7 9800X3D" className={inputClass} />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-zinc-700">Price (USD)</label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
                placeholder="399.00"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">
            Specifications <span className="font-normal text-zinc-500">— {getCategory(category)?.name}</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Structured fields keep filtering and the compatibility engine working.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const raw = product?.specs?.[field.key];
              const value = specToInputValue(field, raw);
              const suggestions = SPEC_SUGGESTIONS[field.key];
              const id = `spec_${field.key}`;
              const listId = suggestions ? `${id}_list` : undefined;
              return (
                <div key={field.key} className={field.type === "list" ? "sm:col-span-2" : undefined}>
                  <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
                    {field.label}
                  </label>
                  {field.type === "boolean" ? (
                    <select id={id} name={id} defaultValue={value || "no"} className={inputClass}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <>
                      <input
                        id={id}
                        name={id}
                        type={field.type === "number" ? "number" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        defaultValue={value}
                        placeholder={field.placeholder}
                        list={listId}
                        className={inputClass}
                      />
                      {listId ? (
                        <datalist id={listId}>
                          {suggestions.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
            {fields.length === 0 ? (
              <p className="text-sm text-zinc-500">No structured specs for this category.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Placeholder image</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- live-generated SVG preview */}
            <img src={previewSrc} alt="Product placeholder preview" width={320} height={240} className="w-full" />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            The illustration is generated from the category drawing with your accent color.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACCENTS.map((hex) => (
              <label key={hex} className="cursor-pointer">
                <input
                  type="radio"
                  name="accent"
                  value={hex}
                  checked={accent === hex}
                  onChange={() => setAccent(hex)}
                  className="peer sr-only"
                />
                <span
                  className="block h-8 w-8 rounded-full ring-2 ring-transparent transition peer-checked:ring-zinc-900"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              </label>
            ))}
          </div>
        </section>

        {state.error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : product ? "Save changes" : "Create product"}
          </button>
          <a href="/admin/products" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Cancel</a>
        </div>
      </div>
    </form>
  );
}
