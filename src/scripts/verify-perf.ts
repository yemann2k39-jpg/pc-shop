/**
 * Sanity-checks benchmark-based performance estimates and pairing warnings.
 * Run: pnpm exec tsx --conditions=react-server src/scripts/verify-perf.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { DEFAULT_DB_PATH } from "../db/paths";
import {
  benchmarkData,
  products,
  type BenchmarkRow,
  type Product,
} from "../db/schema";
import {
  approximateBottleneckPct,
  buildBenchmarkLookup,
  estimateForBuild,
} from "../lib/performance";
import { checkCompatibility } from "../lib/compatibility";

const db = drizzle(new Database(DEFAULT_DB_PATH, { readonly: true }));
const all = db.select().from(products).all() as Product[];
const bySlug = new Map(all.map((p) => [p.slug, p]));
const lookup = buildBenchmarkLookup(db.select().from(benchmarkData).all() as BenchmarkRow[]);

if (lookup.gpu.aaa === undefined || Object.keys(lookup.gpu.aaa).length === 0) {
  console.error("FAIL: no benchmark rows seeded (run seed-benchmarks.ts)");
  process.exit(1);
}

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

// Complete build: measured estimates, all resolutions.
const result = estimateForBuild(selection, lookup);
if (!result.complete || !result.measured) {
  console.error("FAIL: complete build not measured");
  process.exit(1);
}
for (const scenario of result.scenarios) {
  console.log(`\n${scenario.name}:`);
  for (const e of scenario.estimates) {
    console.log(
      `  ${e.resolution}: ${e.fpsLow}-${e.fpsHigh} fps (${e.bottleneck}${e.cpuLimitPct ? `, CPU -${e.cpuLimitPct}%` : ""})`,
    );
  }
}

// Partial build (GPU+CPU): estimates exist, wider range.
const partial = estimateForBuild(
  { gpu: selection.gpu, cpu: selection.cpu },
  lookup,
);
if (partial.complete || partial.scenarios.length === 0) {
  console.error("FAIL: partial build should render provisional estimates");
  process.exit(1);
}
console.log("\npartial (4090+7800X3D) 1080p:", partial.scenarios[0].estimates[0].fpsLow, "-", partial.scenarios[0].estimates[0].fpsHigh);
const cpuOnly = estimateForBuild({ cpu: selection.cpu }, lookup);
if (cpuOnly.scenarios.length !== 0) {
  console.error("FAIL: CPU-only build should have no estimates");
  process.exit(1);
}

// Bottleneck: 4090 + weak CPU must warn >=30%.
const weakCpu = bySlug.get("intel-core-i5-12400f");
if (!weakCpu) throw new Error("missing 12400f");
const pct = approximateBottleneckPct("asus-tuf-rtx-4090-oc", "intel-core-i5-12400f");
console.log("4090 + 12400F bottleneck %:", pct);
const mismatch = checkCompatibility({ gpu: selection.gpu, cpu: weakCpu });
const bottleneckWarn = mismatch.find((f) => f.rule === "gpuCpuBottleneck");
if (!bottleneckWarn || pct < 30) {
  console.error("FAIL: high-end GPU + weak CPU bottleneck warning missing");
  process.exit(1);
}
console.log("warning:", bottleneckWarn.message);

// Premium (Z790/X670E) board + DDR4 must warn.
const premium = all.find(
  (p) =>
    p.category === "motherboard" &&
    typeof p.specs.chipset === "string" &&
    ["Z790", "X670E"].includes(p.specs.chipset),
);
const ddr4 = all.find(
  (p) => p.category === "ram" && p.specs.memoryType === "DDR4",
);
if (premium && ddr4) {
  const ddr4Warn = checkCompatibility({ motherboard: premium, ram: ddr4 })
    .find((f) => f.rule === "premiumBoardDdr4");
  if (!ddr4Warn) {
    console.error("FAIL: premium board + DDR4 warning missing");
    process.exit(1);
  }
  console.log("warning:", ddr4Warn.message);
} else {
  console.log("note: no premium DDR4 board or DDR4 RAM in catalog to exercise that rule");
}

// Balanced pairing: no bottleneck warning.
const okPair = checkCompatibility({
  gpu: selection.gpu,
  cpu: selection.cpu,
}).find((f) => f.rule === "gpuCpuBottleneck");
if (okPair) {
  console.error("FAIL: 4090 + 7800X3D should not warn");
  process.exit(1);
}

console.log("\nVERIFY-PERF-OK");
