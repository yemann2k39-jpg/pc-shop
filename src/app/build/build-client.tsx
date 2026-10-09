"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Product } from "@/db/schema";
import { CATEGORIES } from "@/lib/catalog";
import { checkCompatibility, estimateSystemDraw } from "@/lib/compatibility";
import { formatPrice } from "@/lib/format";

const SEVERITY_STYLES = {
  error: {
    dot: "bg-red-500",
    chip: "border-red-200 bg-red-50 text-red-700",
    label: "Error",
  },
  warning: {
    dot: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Warning",
  },
  info: {
    dot: "bg-blue-400",
    chip: "border-zinc-200 bg-zinc-50 text-zinc-600",
    label: "Info",
  },
} as const;

/** Searchable per-slot part picker. */
function PartSlot({
  categoryName,
  options,
  selected,
  onSelect,
  onClear,
}: {
  categoryName: string;
  options: Product[];
  selected?: Product;
  onSelect: (product: Product) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openPicker = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setQuery("");
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    setQuery("");
  };

  const queryLower = query.trim().toLowerCase();
  const filtered = queryLower
    ? options.filter((p) =>
        `${p.brand} ${p.model}`.toLowerCase().includes(queryLower),
      )
    : options;

  const choose = (product: Product) => {
    onSelect(product);
    closePicker();
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{categoryName}</h3>
        {selected ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-zinc-400 hover:text-red-600"
          >
            Remove
          </button>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
            <Image
              src={selected.imageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {selected.brand} {selected.model}
            </p>
            <p className="text-xs text-zinc-500">
              {formatPrice(selected.priceCents)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">No part selected</p>
      )}

      <div className="mt-3">
        {open ? (
          <div>
            <input
              type="text"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- picker opens on explicit user action
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => {
                // Delay so option clicks register before the list closes.
                closeTimer.current = setTimeout(() => setOpen(false), 150);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  closePicker();
                }
              }}
              placeholder={`Search ${categoryName.toLowerCase()}…`}
              aria-label={`Search ${categoryName.toLowerCase()}`}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
            />
            <ul className="mt-1 max-h-44 overflow-y-auto rounded-md border border-zinc-200">
              {filtered.length === 0 ? (
                <li className="px-2 py-2 text-xs text-zinc-400">No matches</li>
              ) : (
                filtered.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onMouseDown={() => choose(option)}
                      onClick={() => choose(option)}
                      className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-zinc-100"
                    >
                      <span className="truncate">
                        <span className="text-zinc-400">{option.brand}</span>{" "}
                        {option.model}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatPrice(option.priceCents)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            aria-expanded={open}
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
          >
            {selected ? "Change part" : "Choose a part"}
          </button>
        )}
      </div>
    </div>
  );
}

export function BuildClient({ products }: { products: Product[] }) {
  const [selection, setSelection] = useState<Record<string, Product>>({});

  const byCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const list = map.get(product.category) ?? [];
      list.push(product);
      map.set(product.category, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.priceCents - b.priceCents);
    }
    return map;
  }, [products]);

  const findings = useMemo(() => checkCompatibility(selection), [selection]);
  const totalCents = useMemo(
    () => Object.values(selection).reduce((sum, p) => sum + p.priceCents, 0),
    [selection],
  );
  const draw = estimateSystemDraw(selection);
  const psu = selection.psu;
  const psuWattage = psu?.specs.wattageW;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORIES.map((category) => (
          <PartSlot
            key={category.slug}
            categoryName={category.name}
            options={byCategory.get(category.slug) ?? []}
            selected={selection[category.slug]}
            onSelect={(product) =>
              setSelection((prev) => ({ ...prev, [category.slug]: product }))
            }
            onClear={() =>
              setSelection((prev) => {
                const next = { ...prev };
                delete next[category.slug];
                return next;
              })
            }
          />
        ))}
      </div>

      <aside className="lg:w-96 lg:shrink-0">
        <div className="sticky top-20 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Build status
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  errorCount > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {errorCount} {errorCount === 1 ? "error" : "errors"}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                {warningCount} {warningCount === 1 ? "warning" : "warnings"}
              </span>
            </div>

            <dl className="mt-4 space-y-2 border-t border-zinc-200 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Total price</dt>
                <dd className="font-semibold text-zinc-900">
                  {formatPrice(totalCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Estimated draw</dt>
                <dd className="font-medium text-zinc-900">
                  {draw !== undefined ? `~${draw}W` : "—"}
                </dd>
              </div>
              {psu && typeof psuWattage === "number" ? (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">PSU output</dt>
                  <dd className="font-medium text-zinc-900">{psuWattage}W</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Compatibility
            </h2>
            <ul className="mt-3 space-y-2">
              {findings.length === 0 ? (
                <li className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  All good — no compatibility problems detected.
                </li>
              ) : (
                findings.map((finding) => {
                  const style = SEVERITY_STYLES[finding.severity];
                  return (
                    <li
                      key={finding.rule}
                      className="flex items-start gap-2.5 rounded-lg border border-zinc-200 px-3 py-2"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-zinc-800">
                          {finding.message}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${style.chip}`}
                        >
                          {style.label}
                        </span>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <p className="mt-3 text-xs text-zinc-400">
              Estimates are based on catalog specs and simple rules — always
              double-check critical builds.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
