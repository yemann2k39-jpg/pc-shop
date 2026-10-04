import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Values allowed inside a product's structured `specs` JSON object. */
export type SpecValue = string | number | boolean | string[];

export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    /** Category slug, one of the slugs defined in src/lib/catalog.ts */
    category: text("category").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    /** Price in minor units (US cents) to avoid float math. */
    priceCents: integer("price_cents").notNull(),
    stockStatus: text("stock_status")
      .$type<StockStatus>()
      .notNull()
      .default("in_stock"),
    /** Path under /public, e.g. /images/products/amd-ryzen-7-7800x3d.svg */
    imageUrl: text("image_url").notNull(),
    /** Structured, filterable specification key/value map. */
    specs: text("specs", { mode: "json" })
      .$type<Record<string, SpecValue>>()
      .notNull(),
  },
  (table) => [
    index("products_category_idx").on(table.category),
    index("products_brand_idx").on(table.brand),
    // Composite: category pages are the dominant query and sort by price.
    index("products_category_price_idx").on(table.category, table.priceCents),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
