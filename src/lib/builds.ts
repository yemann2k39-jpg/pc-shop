import { cache } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { randomInt } from "node:crypto";

import { db } from "@/db";
import { builds, products, type Build } from "@/db/schema";
import { CATEGORIES } from "@/lib/catalog";

const PUBLIC_ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Human-friendly share id, e.g. "BD-7KQ2M9XW" (crypto randomness). */
export function generateBuildPublicId(): string {
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += PUBLIC_ID_ALPHABET[randomInt(PUBLIC_ID_ALPHABET.length)];
  }
  return `BD-${suffix}`;
}

/** Cached so generateMetadata + page share one query per request. */
export const getBuildByPublicId = cache(async function getBuildByPublicId(
  publicId: string,
): Promise<Build | undefined> {
  const [build] = await db
    .select()
    .from(builds)
    .where(eq(builds.publicId, publicId))
    .limit(1);
  return build;
});

export async function listRecentBuilds(limit = 30): Promise<Build[]> {
  return db
    .select()
    .from(builds)
    .orderBy(desc(builds.createdAt), desc(builds.id))
    .limit(limit);
}

export async function createBuild(input: {
  name: string;
  ownerName?: string;
  note?: string;
  items: Record<string, string>;
}): Promise<Build> {
  let lastError: unknown = null;
  // Retry only on public-id collisions; anything else is a real failure.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [build] = await db
        .insert(builds)
        .values({
          publicId: generateBuildPublicId(),
          name: input.name,
          ownerName: input.ownerName ?? null,
          note: input.note ?? null,
          items: input.items,
        })
        .returning();
      return build;
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code;
      if (code !== "SQLITE_CONSTRAINT_UNIQUE") throw error;
    }
  }
  throw lastError;
}

/** Validates slugs: every category present and existing in the products table. */
export async function validateBuildItems(
  items: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const categorySlugs = CATEGORIES.map((c) => c.slug);
  for (const category of categorySlugs) {
    const slug = items[category];
    if (typeof slug !== "string" || !slug) {
      return { ok: false, error: `Missing part: ${category}` };
    }
  }
  const extra = Object.keys(items).filter((key) => !categorySlugs.includes(key));
  if (extra.length > 0) {
    return { ok: false, error: `Unknown categories: ${extra.join(", ")}` };
  }
  const rows = await db
    .select({ slug: products.slug, category: products.category })
    .from(products)
    .where(inArray(products.slug, Object.values(items)));
  const found = new Map(rows.map((row) => [row.slug, row.category]));
  for (const [category, slug] of Object.entries(items)) {
    if (found.get(slug) !== category) {
      return { ok: false, error: `Invalid product for ${category}: ${slug}` };
    }
  }
  return { ok: true };
}
