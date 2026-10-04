import type { ProductSort } from "./products";

export type QueryValue = string | string[] | undefined;
export type RawQuery = Record<string, QueryValue>;

export function firstParam(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function allParams(value: QueryValue): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

/**
 * Builds a category URL that preserves the current query parameters
 * (including multi-valued ones like `brand`) and applies overrides.
 * Canonical params (default sort, page 1) are omitted so URLs stay clean.
 */
export function buildCategoryHref(
  slug: string,
  current: RawQuery,
  overrides: { sort?: ProductSort; page?: number; remove?: string[] } = {},
): string {
  const search = new URLSearchParams();
  const removed = new Set(overrides.remove ?? []);

  for (const [key, value] of Object.entries(current)) {
    if (key === "sort" || key === "page" || removed.has(key)) continue;
    for (const item of allParams(value)) {
      if (item !== "") search.append(key, item);
    }
  }

  if (overrides.sort !== undefined && overrides.sort !== "name") {
    search.set("sort", overrides.sort);
  }
  if (overrides.page !== undefined && overrides.page > 1) {
    search.set("page", String(overrides.page));
  }

  const query = search.toString();
  return query ? `/category/${slug}?${query}` : `/category/${slug}`;
}
