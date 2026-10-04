import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { products, type Product } from "@/db/schema";

export const PRODUCT_SORTS = ["name", "price-asc", "price-desc"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const SORT_LABELS: Record<ProductSort, string> = {
  name: "Name",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export function parseProductSort(value: string | undefined): ProductSort {
  return PRODUCT_SORTS.includes(value as ProductSort) ? (value as ProductSort) : "name";
}

export type ListProductsOptions = {
  category?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

export type ProductListResult = {
  items: Product[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

export async function listProducts(
  options: ListProductsOptions = {},
): Promise<ProductListResult> {
  const perPage = Math.max(1, options.perPage ?? 6);
  const page = Math.max(1, options.page ?? 1);
  const sort = options.sort ?? "name";

  const where = options.category ? eq(products.category, options.category) : undefined;
  // `id` as the final tiebreaker keeps pagination stable when prices repeat.
  const orderBy =
    sort === "price-asc"
      ? [asc(products.priceCents), asc(products.id)]
      : sort === "price-desc"
        ? [desc(products.priceCents), asc(products.id)]
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

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return product;
}

export async function getCategoryProductCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ category: products.category, value: count() })
    .from(products)
    .groupBy(products.category);
  return new Map(rows.map((row) => [row.category, row.value]));
}
