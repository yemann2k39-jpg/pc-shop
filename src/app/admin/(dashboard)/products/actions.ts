"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { products, STOCK_STATUSES, type SpecValue, type StockStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getCategory } from "@/lib/catalog";
import { saveProductImage, slugify } from "@/lib/product-image";
import { specFieldsForCategory } from "@/lib/admin-spec-fields";

export type ProductFormState = { error?: string };

const MAX_TEXT = 120;

function fail(error: string): ProductFormState {
  return { error };
}

/** Parses the raw FormData into a validated product insert shape. */
function parseProductForm(
  formData: FormData,
  knownSlug: string | undefined,
): { slug: string; category: string; brand: string; model: string; priceCents: number; compareAtCents: number | null; stockStatus: StockStatus; accent: string; specs: Record<string, SpecValue> } | { error: string } {
  const category = String(formData.get("category") ?? "");
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const stockStatus = String(formData.get("stockStatus") ?? "in_stock");
  const accent = String(formData.get("accent") ?? "").trim();

  if (!getCategory(category)) return { error: "Choose a valid category." };
  if (!brand || brand.length > MAX_TEXT) return { error: "Brand is required (max 120 chars)." };
  if (!model || model.length > MAX_TEXT) return { error: "Model is required (max 120 chars)." };

  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 0 || price > 100000) {
    return { error: "Price must be a number between 0 and 100000." };
  }
  const originalCents = Math.round(price * 100);

  // Optional discount percent: the entered price is the ORIGINAL price and
  // the customer pays the discounted amount (compare-at = original).
  const discountRaw = String(formData.get("discountPercent") ?? "").trim();
  let priceCents = originalCents;
  let compareAtCents: number | null = null;
  if (discountRaw) {
    const discountPercent = Number(discountRaw);
    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 95) {
      return { error: "Discount must be a whole number between 1 and 95 percent." };
    }
    compareAtCents = originalCents;
    priceCents = Math.max(1, Math.round((originalCents * (100 - discountPercent)) / 100));
  }

  if (!STOCK_STATUSES.includes(stockStatus as StockStatus)) {
    return { error: "Choose a valid stock status." };
  }

  // Structured specs: only known fields for the category, correctly typed.
  const specs: Record<string, SpecValue> = {};
  for (const field of specFieldsForCategory(category)) {
    const raw = formData.get(`spec_${field.key}`);
    if (raw === null) continue;
    const value = String(raw).trim();
    if (value === "") continue;
    if (field.type === "number") {
      const num = Number(value);
      if (!Number.isFinite(num)) return { error: `${field.label} must be a number.` };
      specs[field.key] = num;
    } else if (field.type === "boolean") {
      specs[field.key] = value === "yes";
    } else if (field.type === "list") {
      specs[field.key] = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else {
      specs[field.key] = value;
    }
  }

  const baseSlug = slugify(`${brand} ${model}`);
  if (!baseSlug) return { error: "Brand and model must contain letters or numbers." };
  const slug = knownSlug ?? baseSlug;

  return { slug, category, brand, model, priceCents, compareAtCents, stockStatus: stockStatus as StockStatus, accent, specs };
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData, undefined);
  if ("error" in parsed) return fail(parsed.error);

  // Ensure slug uniqueness by suffixing when needed.
  let slug = parsed.slug;
  for (let attempt = 2; ; attempt++) {
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (!existing) break;
    slug = `${parsed.slug}-${attempt}`;
  }

  const imageUrl = saveProductImage({
    slug,
    categorySlug: parsed.category,
    brand: parsed.brand,
    model: parsed.model,
    accent: parsed.accent || undefined,
  });

  await db.insert(products).values({
    slug,
    category: parsed.category,
    brand: parsed.brand,
    model: parsed.model,
    priceCents: parsed.priceCents,
    compareAtCents: parsed.compareAtCents,
    stockStatus: parsed.stockStatus,
    imageUrl,
    specs: parsed.specs,
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const originalSlug = String(formData.get("originalSlug") ?? "");
  // Defense-in-depth: the slug feeds a filesystem path for the image write.
  if (!/^[a-z0-9-]+$/.test(originalSlug)) return fail("Invalid product reference.");
  const parsed = parseProductForm(formData, originalSlug);
  if ("error" in parsed) return fail(parsed.error);

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.slug, originalSlug))
    .limit(1);
  if (!existing) return fail("Product no longer exists.");

  const imageUrl = saveProductImage({
    slug: originalSlug,
    categorySlug: parsed.category,
    brand: parsed.brand,
    model: parsed.model,
    accent: parsed.accent || undefined,
  });

  await db
    .update(products)
    .set({
      category: parsed.category,
      brand: parsed.brand,
      model: parsed.model,
      priceCents: parsed.priceCents,
      compareAtCents: parsed.compareAtCents,
      stockStatus: parsed.stockStatus,
      imageUrl,
      specs: parsed.specs,
    })
    .where(eq(products.slug, originalSlug));

  revalidatePath("/admin/products");
  revalidatePath(`/product/${originalSlug}`);
  revalidatePath("/");
  redirect("/admin/products");
}

/** Retire = take out of stock. Non-destructive; the product leaves the shop. */
export async function setRetired(slug: string, retired: boolean): Promise<void> {
  await requireAdmin();

  if (!/^[a-z0-9-]+$/.test(slug)) return;

  await db
    .update(products)
    .set({ stockStatus: retired ? "out_of_stock" : "in_stock" })
    .where(eq(products.slug, slug));

  revalidatePath("/admin/products");
  revalidatePath("/");
}
