import Link from "next/link";

import { firstParam, buildCategoryHref, allParams, type RawQuery } from "@/lib/params";
import type { Facet } from "@/lib/products";
import type { ProductSort } from "@/lib/products";

/** Param names the sidebar owns, used by the "Clear all" link. */
function sidebarParamKeys(facets: Facet[]): string[] {
  return facets.flatMap((facet) =>
    facet.key === "brand"
      ? ["brand"]
      : facet.kind === "numberMin"
        ? [`min_${facet.key}`, facet.key]
        : [facet.key, `min_${facet.key}`],
  );
}

/**
 * Server-rendered faceted filter sidebar. A plain GET form — no client JS.
 * `query` is the current raw search params so selections survive pagination.
 */
export function FilterSidebar({
  slug,
  facets,
  query,
  sort,
  activeFilterCount,
}: {
  slug: string;
  facets: Facet[];
  query: RawQuery;
  sort: string;
  activeFilterCount: number;
}) {
  return (
    <form
      method="get"
      action={`/category/${slug}`}
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4"
      aria-label="Filter products"
    >
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Filters</h2>
        {activeFilterCount > 0 ? (
          <Link
            href={buildCategoryHref(slug, query, {
              sort: (sort as ProductSort) || undefined,
              remove: sidebarParamKeys(facets).concat("priceMin", "priceMax"),
            })}
            className="text-xs font-medium text-blue-700 hover:underline"
          >
            Clear all ({activeFilterCount})
          </Link>
        ) : null}
      </div>

      {facets.map((facet) =>
        facet.key === "brand" ? (
          <fieldset key={facet.key} className="space-y-2">
            <legend className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {facet.label}
            </legend>
            {facet.values.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  name="brand"
                  value={option.value}
                  defaultChecked={allParams(query.brand).includes(option.value)}
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                />
                {option.value}
                <span className="text-xs text-zinc-400">({option.count})</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <fieldset key={facet.key} className="space-y-1">
            <legend className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {facet.label}
            </legend>
            <select
              name={facet.kind === "numberMin" ? `min_${facet.key}` : facet.key}
              defaultValue={
                firstParam(
                  query[facet.kind === "numberMin" ? `min_${facet.key}` : facet.key],
                ) ?? ""
              }
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {facet.values.map((option) => (
                <option key={option.value} value={option.value}>
                  {facet.kind === "numberMin"
                    ? `${option.value} ${facet.unit ?? ""}+ (${option.count})`
                    : `${option.value} (${option.count})`}
                </option>
              ))}
            </select>
          </fieldset>
        ),
      )}

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Price (USD)
        </legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="priceMin"
            min="0"
            step="any"
            placeholder="Min"
            defaultValue={firstParam(query.priceMin) ?? ""}
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            aria-label="Minimum price"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="number"
            name="priceMax"
            min="0"
            step="any"
            placeholder="Max"
            defaultValue={firstParam(query.priceMax) ?? ""}
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            aria-label="Maximum price"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Apply filters
      </button>
    </form>
  );
}
