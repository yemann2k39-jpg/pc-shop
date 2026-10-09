import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { validateDiscountCode } from "@/lib/discounts";
import { MAX_QTY_PER_ITEM } from "@/lib/cart-context";

const MAX_ITEMS = 50;

type ValidateItem = { slug?: unknown; qty?: unknown };

/** Validates a discount code against the live cart (prices re-read from DB). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    items?: ValidateItem[];
  } | null;

  if (!body || typeof body.code !== "string" || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ ok: false, reason: "Enter a code." }, { status: 400 });
  }
  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json({ ok: false, reason: "Too many distinct items." }, { status: 400 });
  }

  const requested = new Map<string, number>();
  for (const entry of body.items) {
    const { slug, qty } = entry ?? {};
    if (typeof slug !== "string" || !slug) {
      return NextResponse.json({ ok: false, reason: "Invalid cart item." }, { status: 400 });
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return NextResponse.json({ ok: false, reason: "Invalid cart quantity." }, { status: 400 });
    }
    requested.set(slug, qty);
  }

  // Never trust client prices: re-read every product from the database.
  const rows = await db
    .select({ slug: products.slug, priceCents: products.priceCents })
    .from(products)
    .where(inArray(products.slug, [...requested.keys()]));
  if (rows.length !== requested.size) {
    return NextResponse.json(
      { ok: false, reason: "Some products in your cart are no longer available." },
      { status: 409 },
    );
  }

  const items = rows.map((row) => ({
    slug: row.slug,
    unitPriceCents: row.priceCents,
    qty: requested.get(row.slug) ?? 0,
  }));
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0);

  const result = await validateDiscountCode(body.code, items, subtotalCents);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
