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
    /**
     * Optional original price (cents) shown crossed out when the product is
     * on sale (priceCents is the discounted, charged price).
     */
    compareAtCents: integer("compare_at_cents"),
    /** Demo "sales" ranking for the Best selling sort (higher = more sold). */
    popularity: integer("popularity").notNull().default(0),
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
    /** Discount code applied at checkout, if any (uppercase). */
    discountCode: text("discount_code"),
    /** Amount subtracted from subtotalCents, in cents. */
    discountCents: integer("discount_cents").notNull().default(0),
    /** Guards the one-time redemption counter on the discount row. */
    discountRedeemed: integer("discount_redeemed", { mode: "boolean" })
      .notNull()
      .default(false),
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

/* ------------------------------ Discounts ------------------------------ */

export const DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const discounts = sqliteTable("discounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Uppercase code the customer types at checkout, e.g. "SPRING10". */
  code: text("code").notNull().unique(),
  /** "percent" (value = 1-100) or "fixed" (value = cents off). */
  type: text("type").$type<DiscountType>().notNull(),
  value: integer("value").notNull(),
  /** Minimum order subtotal in cents for the code to apply (0 = none). */
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  /**
   * Product slugs the code applies to. Empty = the whole order; non-empty =
   * the discount is computed only on the matching items' subtotal.
   */
  productSlugs: text("product_slugs", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  /** Hard cap on redemptions across all orders (null = unlimited). */
  maxRedemptions: integer("max_redemptions"),
  timesUsed: integer("times_used").notNull().default(0),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;

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
  /** Owning account, when saved while signed in (null = anonymous share). */
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Build = typeof builds.$inferSelect;
export type NewBuild = typeof builds.$inferInsert;

/* -------------------------------- Users -------------------------------- */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Lowercased, trimmed — the login identity. */
  email: text("email").notNull().unique(),
  /** Display name shown in the header and account page. */
  name: text("name").notNull(),
  /** scrypt hash: "scrypt:<saltHex>:<hashHex>". */
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/* ------------------------------- Sessions ------------------------------ */

export const sessions = sqliteTable(
  "sessions",
  {
    /** 256-bit random token; stored in the user's httpOnly cookie. */
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/* --------------------------- Benchmark data ---------------------------- */

export const benchmarkData = sqliteTable(
  "benchmark_data",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Product slug (GPU or CPU). */
    slug: text("slug").notNull(),
    /** "gpu" or "cpu". */
    kind: text("kind").$type<"gpu" | "cpu">().notNull(),
    /** "aaa" or "esports". */
    scenario: text("scenario").$type<"aaa" | "esports">().notNull(),
    /** "1080p" | "1440p" | "4K"; null = applies to every resolution (CPU caps). */
    resolution: text("resolution"),
    /** Measured/aggregate average FPS for this cell. */
    avgFps: integer("avg_fps").notNull(),
    /** Where the number came from. */
    source: text("source").notNull(),
  },
  (table) => [
    index("benchmark_slug_idx").on(table.slug),
    index("benchmark_lookup_idx").on(table.kind, table.scenario, table.resolution),
  ],
);

export type BenchmarkRow = typeof benchmarkData.$inferSelect;
export type NewBenchmarkRow = typeof benchmarkData.$inferInsert;
