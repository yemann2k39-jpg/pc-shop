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

/** Computes the discount in cents for a subtotal, or why it does not apply. */
export function computeDiscount(
  discount: Discount,
  subtotalCents: number,
): DiscountValidation {
  if (!discount.active) return { ok: false, reason: "This code is no longer active." };
  if (discount.expiresAt && discount.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "This code has expired." };
  }
  if (discount.maxRedemptions !== null && discount.timesUsed >= discount.maxRedemptions) {
    return { ok: false, reason: "This code has reached its redemption limit." };
  }
  if (subtotalCents < discount.minSubtotalCents) {
    return {
      ok: false,
      reason: `This code requires a minimum order of ${(discount.minSubtotalCents / 100).toFixed(2)} USD.`,
    };
  }

  const discountCents =
    discount.type === "percent"
      ? Math.floor((subtotalCents * discount.value) / 100)
      : Math.min(discount.value, subtotalCents);

  // A code that covers the entire order is rejected: payment providers
  // (Stripe) reject $0 sessions, so full-free orders are not supported.
  if (discountCents >= subtotalCents) {
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

/** Server-side validation for the checkout validate endpoint. */
export async function validateDiscountCode(
  rawCode: string,
  subtotalCents: number,
): Promise<DiscountValidation> {
  const discount = await findDiscount(rawCode);
  if (!discount) return { ok: false, reason: "This code is not valid." };
  return computeDiscount(discount, subtotalCents);
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
