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

/* ------------------------------- Orders -------------------------------- */

export const ORDER_STATUSES = ["pending", "paid", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Line-item snapshot stored on the order (prices at purchase time). */
export type OrderItem = {
  slug: string;
  brand: string;
  model: string;
  imageUrl: string;
  unitPriceCents: number;
  qty: number;
};

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderNumber: text("order_number").notNull().unique(),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    shippingAddress: text("shipping_address").notNull(),
    shippingCity: text("shipping_city").notNull(),
    shippingPostalCode: text("shipping_postal_code").notNull(),
    shippingCountry: text("shipping_country").notNull(),
    items: text("items", { mode: "json" }).$type<OrderItem[]>().notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    /** Set by the payment provider when a checkout session is created. */
    paymentSessionId: text("payment_session_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("orders_session_idx").on(table.paymentSessionId)],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

/* ------------------------------- Builds -------------------------------- */

export const builds = sqliteTable("builds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  publicId: text("public_id").notNull().unique(),
  name: text("name").notNull(),
  ownerName: text("owner_name"),
  note: text("note"),
  /** Category slug -> product slug. Products re-hydrated at render time. */
  items: text("items", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Build = typeof builds.$inferSelect;
export type NewBuild = typeof builds.$inferInsert;
