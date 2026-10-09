import "server-only";

import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { discounts, type Discount } from "@/db/schema";

/**
 * Discount-code engine. Validation is server-side only; the client gets a
 * computed amount back and the checkout endpoint re-validates from the DB —
 * client prices/amounts are never trusted.
 */

export type DiscountValidation =
  | { ok: true; code: string; label: string; discountCents: number }
  | { ok: false; reason: string };

export function discountLabel(discount: Discount): string {
  return discount.type === "percent"
    ? `${discount.value}% off`
    : `${(discount.value / 100).toFixed(2)} USD off`;
}

/**
 * Computes the discount against the cart, honoring product scoping: an empty
 * `productSlugs` list applies to the whole order, otherwise only the matching
 * items' subtotal is discounted. Prices come from the server's own product
 * rows, never from the client.
 */
export function computeDiscountForItems(
  discount: Discount,
  items: Array<{ slug: string; unitPriceCents: number; qty: number }>,
  orderSubtotalCents: number,
): DiscountValidation {
  if (!discount.active) return { ok: false, reason: "This code is no longer active." };
  if (discount.expiresAt && discount.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "This code has expired." };
  }
  if (discount.maxRedemptions !== null && discount.timesUsed >= discount.maxRedemptions) {
    return { ok: false, reason: "This code has reached its redemption limit." };
  }

  const scoped = discount.productSlugs;
  const eligibleCents = scoped.length
    ? items
        .filter((item) => scoped.includes(item.slug))
        .reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0)
    : orderSubtotalCents;

  if (eligibleCents === 0) {
    return {
      ok: false,
      reason: "This code only applies to specific products that are not in your cart.",
    };
  }
  if (eligibleCents < discount.minSubtotalCents) {
    return {
      ok: false,
      reason: `This code requires a minimum (eligible) order of ${(discount.minSubtotalCents / 100).toFixed(2)} USD.`,
    };
  }

  const discountCents =
    discount.type === "percent"
      ? Math.floor((eligibleCents * discount.value) / 100)
      : Math.min(discount.value, eligibleCents);

  // A code that covers the entire order is rejected: payment providers
  // (Stripe) reject $0 sessions, so full-free orders are not supported.
  if (discountCents >= orderSubtotalCents) {
    return { ok: false, reason: "This code cannot cover the full order amount." };
  }

  return { ok: true, code: discount.code, label: discountLabel(discount), discountCents };
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 40);
}

/** Looks up a discount by (normalized) code, if it exists. */
export async function findDiscount(code: string): Promise<Discount | undefined> {
  const normalized = normalizeCode(code);
  if (!normalized) return undefined;
  const [discount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.code, normalized))
    .limit(1);
  return discount;
}

/**
 * Server-side validation against DB-priced cart items. Item prices passed in
 * must come from the products table, not the client.
 */
export async function validateDiscountCode(
  rawCode: string,
  items: Array<{ slug: string; unitPriceCents: number; qty: number }>,
  orderSubtotalCents: number,
): Promise<DiscountValidation> {
  const discount = await findDiscount(rawCode);
  if (!discount) return { ok: false, reason: "This code is not valid." };
  return computeDiscountForItems(discount, items, orderSubtotalCents);
}

/**
 * Marks a discount as redeemed. The increment is conditional so concurrent
 * paid orders can never push timesUsed past maxRedemptions (SQLite
 * serializes writes, making this compare-and-set race-free). Returns false
 * when the limit was already reached.
 */
export async function recordDiscountRedemption(code: string): Promise<boolean> {
  const result = await db
    .update(discounts)
    .set({ timesUsed: sql`${discounts.timesUsed} + 1` })
    .where(
      and(
        eq(discounts.code, code),
        or(isNull(discounts.maxRedemptions), lt(discounts.timesUsed, discounts.maxRedemptions)),
      ),
    )
    .run();
  return result.changes > 0;
}
