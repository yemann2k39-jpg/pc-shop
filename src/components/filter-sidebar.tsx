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
      className="space-y-6 rounded-xl border border-line bg-surface p-4"
      aria-label="Filter products"
    >
      {sort !== "name" ? <input type="hidden" name="sort" value={sort} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        {activeFilterCount > 0 ? (
          <Link
            href={buildCategoryHref(slug, query, {
              sort: sort === "name" ? undefined : (sort as ProductSort),
              remove: sidebarParamKeys(facets).concat("priceMin", "priceMax"),
            })}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear all ({activeFilterCount})
          </Link>
        ) : null}
      </div>

      {facets.map((facet) =>
        facet.key === "brand" ? (
          <fieldset key={facet.key} className="space-y-2">
            <legend className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              {facet.label}
            </legend>
            {facet.values.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm text-ink-dim"
              >
                <input
                  type="checkbox"
                  name="brand"
                  value={option.value}
                  defaultChecked={allParams(query.brand).includes(option.value)}
                  className="h-4 w-4 rounded border-line bg-raised accent-accent"
                />
                {option.value}
                <span className="text-xs text-ink-faint">({option.count})</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <fieldset key={facet.key} className="space-y-1">
            <legend className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              {facet.label}
            </legend>
            <select
              name={facet.kind === "numberMin" ? `min_${facet.key}` : facet.key}
              defaultValue={
                firstParam(
                  query[facet.kind === "numberMin" ? `min_${facet.key}` : facet.key],
                ) ?? ""
              }
              className="w-full rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-ink"
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
        <legend className="text-xs font-medium tracking-wide text-ink-faint uppercase">
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
            className="w-full rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint"
            aria-label="Minimum price"
          />
          <span className="text-ink-faint">–</span>
          <input
            type="number"
            name="priceMax"
            min="0"
            step="any"
            placeholder="Max"
            defaultValue={firstParam(query.priceMax) ?? ""}
            className="w-full rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint"
            aria-label="Maximum price"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full rounded-lg bg-accent-strong px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong/90"
      >
        Apply filters
      </button>
    </form>
  );
}
