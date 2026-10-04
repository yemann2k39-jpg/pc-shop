import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { orders, products, type OrderItem } from "@/db/schema";
import { MAX_QTY_PER_ITEM } from "@/lib/cart-context";
import { generateOrderNumber, setOrderSession } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";

const MAX_FIELD_LENGTH = 200;
const MAX_CART_ITEMS = 50;

type CheckoutBody = {
  customer?: {
    name?: unknown;
    email?: unknown;
    address?: unknown;
    city?: unknown;
    postalCode?: unknown;
    country?: unknown;
  };
  items?: unknown;
};

function nonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= MAX_FIELD_LENGTH
  );
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CheckoutBody | null;
  if (!body) return badRequest("Invalid JSON body");

  const customer = body.customer ?? {};
  for (const field of ["name", "email", "address", "city", "postalCode", "country"] as const) {
    if (!nonEmptyString(customer[field])) {
      return badRequest(`Missing or invalid field: customer.${field}`);
    }
  }
  const email = String(customer.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("Invalid email address");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return badRequest("Cart is empty");
  }
  if (body.items.length > MAX_CART_ITEMS) {
    return badRequest(`Too many distinct items (max ${MAX_CART_ITEMS})`);
  }
  const requested = new Map<string, number>();
  for (const entry of body.items) {
    if (typeof entry !== "object" || entry === null) return badRequest("Invalid cart item");
    const { slug, qty } = entry as { slug?: unknown; qty?: unknown };
    if (typeof slug !== "string" || !slug) return badRequest("Invalid cart item slug");
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return badRequest(`Invalid quantity for ${slug} (1-${MAX_QTY_PER_ITEM})`);
    }
    requested.set(slug, qty);
  }

  // Never trust client prices: re-read every product from the database.
  const rows = await db
    .select()
    .from(products)
    .where(inArray(products.slug, [...requested.keys()]));
  if (rows.length !== requested.size) {
    return NextResponse.json(
      { error: "Some products in your cart are no longer available" },
      { status: 409 },
    );
  }

  const items: OrderItem[] = [];
  let subtotalCents = 0;
  for (const product of rows) {
    if (product.stockStatus === "out_of_stock") {
      return NextResponse.json(
        { error: `${product.brand} ${product.model} is out of stock` },
        { status: 409 },
      );
    }
    const qty = requested.get(product.slug) ?? 0;
    items.push({
      slug: product.slug,
      brand: product.brand,
      model: product.model,
      imageUrl: product.imageUrl,
      unitPriceCents: product.priceCents,
      qty,
    });
    subtotalCents += product.priceCents * qty;
  }

  const orderNumber = generateOrderNumber();
  // `.returning()` gives us the inserted row directly (better-sqlite3 driver).
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      status: "pending",
      customerName: String(customer.name).trim(),
      customerEmail: email,
      shippingAddress: String(customer.address).trim(),
      shippingCity: String(customer.city).trim(),
      shippingPostalCode: String(customer.postalCode).trim(),
      shippingCountry: String(customer.country).trim(),
      items,
      subtotalCents,
    })
    .returning();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const provider = getPaymentProvider();
  try {
    const session = await provider.createCheckout({
      order,
      successUrl: `${appUrl}/order/${orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/cart`,
    });
    await setOrderSession(orderNumber, session.sessionId);
    return NextResponse.json({ url: session.url, orderNumber, provider: provider.name });
  } catch (error) {
    console.error("Payment session creation failed:", error);
    // Don't strand a pending order with no payment session.
    await db.delete(orders).where(inArray(orders.orderNumber, [orderNumber]));
    return NextResponse.json(
      { error: "Could not start the payment session. Please try again." },
      { status: 502 },
    );
  }
}
