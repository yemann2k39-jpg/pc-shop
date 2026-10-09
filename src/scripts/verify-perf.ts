/**
 * Sanity-checks build-level performance estimates.
 * Run: pnpm tsx src/scripts/verify-perf.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { DEFAULT_DB_PATH } from "../db/paths";
import { products, type Product } from "../db/schema";
import { estimateForBuild } from "../lib/performance";

const db = drizzle(new Database(DEFAULT_DB_PATH, { readonly: true }));
const all = db.select().from(products).all() as Product[];
const bySlug = new Map(all.map((p) => [p.slug, p]));

const slugs = {
  cpu: "amd-ryzen-7-7800x3d",
  gpu: "asus-tuf-rtx-4090-oc",
  motherboard: "msi-mag-b650-tomahawk-wifi",
  ram: "g-skill-trident-z5-neo-32gb-ddr5-6000-cl30",
  storage: "samsung-990-pro-2tb",
  psu: "corsair-rm850x-850w",
  cooler: "thermalright-peerless-assassin-120-se",
  case: "lian-li-lancool-216",
};

const selection: Partial<Record<string, Product>> = {};
for (const [category, slug] of Object.entries(slugs)) {
  const product = bySlug.get(slug);
  if (!product) throw new Error(`unknown slug ${slug}`);
  selection[category] = product;
}

const result = estimateForBuild(selection);
if (!result.complete) {
  console.error("FAIL: build reported incomplete");
  process.exit(1);
}
for (const scenario of result.scenarios) {
  console.log(`\n${scenario.name}:`);
  for (const e of scenario.estimates) {
    console.log(
      `  ${e.resolution}: ${e.fpsLow}-${e.fpsHigh} fps (${e.bottleneck})`,
    );
  }
}
console.log("notes:", result.notes.join(" ") || "(none)");

// incomplete build -> no numbers
const partial = estimateForBuild({ cpu: selection.cpu });
console.log("partial build complete flag:", partial.complete);
if (partial.complete) process.exit(1);
