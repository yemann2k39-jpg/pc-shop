"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { discounts, DISCOUNT_TYPES, products, type DiscountType } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { normalizeCode } from "@/lib/discounts";

export type DiscountFormState = { error?: string; ok?: string };

export async function createDiscount(
  _prev: DiscountFormState,
  formData: FormData,
): Promise<DiscountFormState> {
  await requireAdmin();

  const code = normalizeCode(String(formData.get("code") ?? ""));
  const type = String(formData.get("type") ?? "");
  const valueRaw = String(formData.get("value") ?? "").trim();
  const minSubtotal = Number(String(formData.get("minSubtotal") ?? "0") || "0");
  const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const productSlugsRaw = String(formData.get("productSlugs") ?? "");
  const productSlugs = [
    ...new Set(
      productSlugsRaw
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean),
    ),
  ];

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return { error: "Code must be 3-40 letters, numbers, dashes, or underscores." };
  }
  if (!DISCOUNT_TYPES.includes(type as DiscountType)) {
    return { error: "Choose a discount type." };
  }
  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Value must be a positive number." };
  }
  const valueInt = type === "percent" ? Math.round(value) : Math.round(value * 100);
  if (type === "percent" && (valueInt < 1 || valueInt > 100)) {
    return { error: "Percent discount must be between 1 and 100." };
  }
  if (type === "fixed" && valueInt < 1) {
    return { error: "Fixed amount must be at least 0.01." };
  }
  if (!Number.isFinite(minSubtotal) || minSubtotal < 0 || minSubtotal > 100000) {
    return { error: "Minimum order must be between 0 and 100000." };
  }
  let maxRedemptions: number | null = null;
  if (maxRedemptionsRaw) {
    const parsed = Number(maxRedemptionsRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { error: "Usage limit must be a whole number of at least 1." };
    }
    maxRedemptions = parsed;
  }
  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const parsed = new Date(`${expiresAtRaw}T23:59:59`);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Invalid expiry date." };
    }
    expiresAt = parsed;
  }

  // Validate the scoped slugs against the catalog so codes can't target
  // products that don't exist.
  if (productSlugs.length > 0) {
    const known = await db
      .select({ slug: products.slug })
      .from(products)
      .where(inArray(products.slug, productSlugs));
    if (known.length !== productSlugs.length) {
      return { error: "One or more selected products no longer exist." };
    }
  }

  const [existing] = await db
    .select({ id: discounts.id })
    .from(discounts)
    .where(eq(discounts.code, code))
    .limit(1);
  if (existing) {
    return { error: `Code ${code} already exists.` };
  }

  await db.insert(discounts).values({
    code,
    type: type as DiscountType,
    value: valueInt,
    minSubtotalCents: Math.round(minSubtotal * 100),
    maxRedemptions,
    expiresAt,
    productSlugs,
  });

  revalidatePath("/admin/discounts");
  return { ok: `Code ${code} created.` };
}

export async function setDiscountActive(code: string, active: boolean): Promise<void> {
  await requireAdmin();

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return;

  await db.update(discounts).set({ active }).where(eq(discounts.code, code));
  revalidatePath("/admin/discounts");
}
