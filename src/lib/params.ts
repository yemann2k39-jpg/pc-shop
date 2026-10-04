import type { ProductSort } from "./products";

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

/**
 * Builds a category URL that preserves the current query parameters and
 * applies overrides. Canonical params (default sort, page 1) are omitted so
 * URLs stay clean and cache-friendly.
 */
export function buildCategoryHref(
  slug: string,
  current: Record<string, string | undefined>,
  overrides: { sort?: ProductSort; page?: number } = {},
): string {
  const merged: Record<string, string | undefined> = { ...current };
  if (overrides.sort !== undefined) merged.sort = overrides.sort;
  if (overrides.page !== undefined) {
    merged.page = overrides.page > 1 ? String(overrides.page) : undefined;
  }
  if (merged.sort === "name") merged.sort = undefined;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const query = search.toString();
  return query ? `/category/${slug}?${query}` : `/category/${slug}`;
}
