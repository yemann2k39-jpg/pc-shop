import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { products, type Product, type StockStatus } from "@/db/schema";
import type { CategoryFilter } from "@/lib/catalog";

export const PRODUCT_SORTS = [
  "best-selling",
  "name",
  "price-asc",
  "price-desc",
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const SORT_LABELS: Record<ProductSort, string> = {
  "best-selling": "Best selling",
  name: "Name",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export function parseProductSort(value: string | undefined): ProductSort {
  return (PRODUCT_SORTS as readonly string[]).includes(value ?? "")
    ? (value as ProductSort)
    : "best-selling";
}

export type SpecExactFilter = { key: string; value: string };
export type SpecMinFilter = { key: string; value: number };

export type ListProductsOptions = {
  category?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  /** Restrict to these brands. */
  brands?: string[];
  /** Inclusive price bounds in cents. */
  priceMin?: number;
  priceMax?: number;
  /** Exact matches against structured specs (works for scalar and array values). */
  specExact?: SpecExactFilter[];
  /** Minimum thresholds against numeric structured specs. */
  specMin?: SpecMinFilter[];
  /** Case-insensitive text match against brand + model. */
  query?: string;
  /** Restrict to this stock status. */
  stockStatus?: StockStatus;
};

export type ProductListResult = {
  items: Product[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

function specExactCondition({ key, value }: SpecExactFilter): SQL {
  // json_each also yields a single row for scalar specs, so this one form
  // covers both scalar ("socket") and array ("supportedSockets") values.
  // CAST normalizes JSON numbers/booleans to TEXT so the comparison is
  // type-affinity-proof.
  return sql`EXISTS (
    SELECT 1 FROM json_each(${products.specs}, ${`$.${key}`}) je
    WHERE CAST(je.value AS TEXT) = ${value}
  )`;
}

function specMinCondition({ key, value }: SpecMinFilter): SQL {
  // Guard with TYPEOF so a numeric threshold never matches text-typed specs.
  return sql`EXISTS (
    SELECT 1 FROM json_each(${products.specs}, ${`$.${key}`}) je
    WHERE TYPEOF(je.value) IN ('integer', 'real') AND je.value >= ${value}
  )`;
}

function buildConditions(options: ListProductsOptions): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (options.category) conditions.push(eq(products.category, options.category));
  if (options.stockStatus) conditions.push(eq(products.stockStatus, options.stockStatus));
  if (options.brands?.length) conditions.push(inArray(products.brand, options.brands));
  if (options.priceMin !== undefined) conditions.push(gte(products.priceCents, options.priceMin));
  if (options.priceMax !== undefined) conditions.push(lte(products.priceCents, options.priceMax));
  for (const filter of options.specExact ?? []) conditions.push(specExactCondition(filter));
  for (const filter of options.specMin ?? []) conditions.push(specMinCondition(filter));
  if (options.query) {
    // LIKE is case-insensitive for ASCII in SQLite; drop wildcards from input.
    const needle = `%${options.query.replace(/[%_]/g, " ").trim()}%`;
    conditions.push(
      sql`(${products.brand} || ' ' || ${products.model}) LIKE ${needle}`,
    );
  }

  const defined = conditions.filter((c): c is SQL => c !== undefined);
  return defined.length > 0 ? and(...defined) : undefined;
}

export async function listProducts(
  options: ListProductsOptions = {},
): Promise<ProductListResult> {
  const perPage = Math.max(1, options.perPage ?? 6);
  const page = Math.max(1, options.page ?? 1);
  const sort = options.sort ?? "name";

  const where = buildConditions(options);
  // `id` as the final tiebreaker keeps pagination stable when values repeat.
  const orderBy =
    sort === "price-asc"
      ? [asc(products.priceCents), asc(products.id)]
      : sort === "price-desc"
        ? [desc(products.priceCents), asc(products.id)]
        : sort === "best-selling"
          ? [desc(products.popularity), asc(products.id)]
          : [asc(products.brand), asc(products.model), asc(products.id)];

  const items = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(...orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage);

  const [totalRow] = await db
    .select({ value: count() })
    .from(products)
    .where(where);

  const total = totalRow?.value ?? 0;

  return {
    items,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

// React cache() dedupes the per-request lookups coming from both
// generateMetadata and the page component.
export const getProductBySlug = cache(async (slug: string): Promise<Product | undefined> => {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return product;
});

/** Same-category products with the closest price to the given product. */
export async function getSimilarProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(
      and(eq(products.category, product.category), ne(products.id, product.id)),
    )
    .orderBy(
      sql`ABS(${products.priceCents} - ${product.priceCents})`,
      asc(products.id),
    )
    .limit(limit);
}

export async function getCategoryProductCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ category: products.category, value: count() })
    .from(products)
    .groupBy(products.category);
  return new Map(rows.map((row) => [row.category, row.value]));
}

/** Per-status product counts for one category (used on category headers). */
export async function getCategoryStockCounts(
  category: string,
): Promise<{ inStock: number; outOfStock: number }> {
  const rows = await db
    .select({ status: products.stockStatus, value: count() })
    .from(products)
    .where(eq(products.category, category))
    .groupBy(products.stockStatus);
  const get = (status: StockStatus) =>
    rows.find((row) => row.status === status)?.value ?? 0;
  return { inStock: get("in_stock") + get("low_stock"), outOfStock: get("out_of_stock") };
}

/* ------------------------------------------------------------------ */
/* Facets                                                              */
/* ------------------------------------------------------------------ */

export type FacetValue = { value: string; count: number };
export type Facet = {
  key: string;
  label: string;
  kind: CategoryFilter["kind"];
  unit?: string;
  values: FacetValue[];
};

export async function getBrandFacet(category: string): Promise<Facet> {
  const rows = await db
    .select({ value: products.brand, count: count() })
    .from(products)
    .where(eq(products.category, category))
    .groupBy(products.brand)
    .orderBy(asc(products.brand));
  return { key: "brand", label: "Brand", kind: "enum", values: rows };
}

export async function getSpecFacet(
  category: string,
  filter: CategoryFilter,
): Promise<Facet> {
  const rows = await db.all<{ value: string | number; count: number }>(sql`
    SELECT je.value AS value, COUNT(*) AS count
    FROM products p, json_each(p.specs, ${`$.${filter.key}`}) je
    WHERE p.category = ${category}
    GROUP BY je.value
    ORDER BY je.value
  `);
  return {
    key: filter.key,
    label: filter.label,
    kind: filter.kind,
    unit: filter.kind === "numberMin" ? filter.unit : undefined,
    values: rows.map((row) => ({ value: String(row.value), count: row.count })),
  };
}

export async function getCategoryFacets(
  category: string,
  filters: CategoryFilter[],
): Promise<Facet[]> {
  const [brandFacet, specFacets] = await Promise.all([
    getBrandFacet(category),
    Promise.all(filters.map((filter) => getSpecFacet(category, filter))),
  ]);
  return [brandFacet, ...specFacets];
}
