/**
 * Verifies the compatibility engine against known-good and known-bad builds
 * from the seeded catalog. Run: pnpm verify:compat
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { DEFAULT_DB_PATH } from "../db/paths";
import { products, type Product } from "../db/schema";
import { checkCompatibility, type BuildSelection } from "../lib/compatibility";

const dbPath = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
const sqlite = new Database(dbPath, { readonly: true });
const db = drizzle(sqlite);

const all = db.select().from(products).all() as Product[];
const bySlug = new Map(all.map((p) => [p.slug, p]));

type Scenario = Record<string, string>;

function pick(scenario: Scenario): BuildSelection {
  const sel: BuildSelection = {};
  for (const [category, slug] of Object.entries(scenario)) {
    const product = bySlug.get(slug);
    if (!product) throw new Error(`Unknown slug in scenario: ${slug}`);
    if (product.category !== category) {
      throw new Error(
        `Slug ${slug} is a ${product.category}, but the scenario assigns it to ${category}`,
      );
    }
    sel[category] = product;
  }
  return sel;
}

let failures = 0;

function expect(
  name: string,
  selection: BuildSelection,
  severity: "error" | "warning" | "info",
  rule: string,
) {
  const findings = checkCompatibility(selection);
  const match = findings.find(
    (f) => f.severity === severity && f.rule === rule,
  );
  if (match) {
    console.log(`PASS [${name}] ${severity}/${rule}: ${match.message}`);
  } else {
    failures += 1;
    console.error(`FAIL [${name}] expected ${severity} on rule "${rule}"`);
    console.error("  findings were:", JSON.stringify(findings, null, 2));
  }
}

// 1. Valid AM5 gaming build — no errors expected.
const valid = checkCompatibility(
  pick({
    cpu: "amd-ryzen-7-7800x3d",
    gpu: "sapphire-pulse-rx-7800-xt",
    motherboard: "msi-mag-b650-tomahawk-wifi",
    ram: "g-skill-trident-z5-neo-32gb-ddr5-6000-cl30",
    storage: "samsung-990-pro-2tb",
    psu: "corsair-rm850x-850w",
    cooler: "thermalright-peerless-assassin-120-se",
    case: "lian-li-lancool-216",
  }),
);
const errors = valid.filter((f) => f.severity === "error");
if (errors.length === 0) {
  console.log(`PASS [valid-am5-build] no errors (${valid.length} info/warnings)`);
} else {
  failures += 1;
  console.error("FAIL [valid-am5-build] unexpected errors:", errors);
}

// 2. Intel CPU on an AM5 board — socket mismatch.
expect(
  "intel-on-am5",
  pick({ cpu: "intel-core-i5-14600k", motherboard: "msi-mag-b650-tomahawk-wifi" }),
  "error",
  "cpuSocket",
);

// 3. DDR4 RAM on a DDR5 board.
expect(
  "ddr4-on-ddr5-board",
  pick({ ram: "corsair-vengeance-lpx-32gb-ddr4-3600", motherboard: "msi-mag-b650-tomahawk-wifi" }),
  "error",
  "ramType",
);

// 4. RTX 4090 (348mm) in a 4000D (360mm limit) — no GPU length error.
const gpu4090 = checkCompatibility(
  pick({
    cpu: "amd-ryzen-5-7600x",
    gpu: "asus-tuf-rtx-4090-oc",
    motherboard: "asus-prime-b760-plus",
    ram: "kingston-fury-beast-32gb-ddr5-5600",
    storage: "crucial-p3-plus-1tb",
    psu: "corsair-rm1000x-1000w",
    cooler: "arctic-liquid-freezer-iii-360",
    case: "corsair-4000d-airflow",
  }),
);
const gpuErrors = gpu4090.filter(
  (f) => f.severity === "error" && f.rule === "gpuLength",
);
if (gpuErrors.length === 0) {
  console.log("PASS [4090-in-4000d] GPU fits (no length error)");
} else {
  failures += 1;
  console.error("FAIL [4090-in-4000d] unexpected GPU length error:", gpuErrors);
}

// 5. ATX board + 348mm GPU + 165mm cooler in an NR200 (ITX-only, 330mm, 155mm)
//    and a 750W PSU on a ~635W build — four distinct findings.
const nr200Sel = pick({
  cpu: "intel-core-i7-14700k",
  gpu: "asus-tuf-rtx-4090-oc",
  motherboard: "msi-pro-z790-p-wifi",
  ram: "kingston-fury-beast-32gb-ddr5-5600",
  storage: "wd-black-sn850x-1tb",
  psu: "seasonic-focus-gx-750",
  cooler: "noctua-nh-d15-chromax-black",
  case: "cooler-master-nr200",
});
expect("nr200-form-factor", nr200Sel, "error", "formFactor");
expect("nr200-gpu-length", nr200Sel, "error", "gpuLength");
expect("nr200-cooler-height", nr200Sel, "error", "coolerHeight");
expect("nr200-psu-headroom", nr200Sel, "warning", "psuWattage");

// 6. No GPU with a non-iGPU CPU — display warning.
expect(
  "no-display-path",
  pick({ cpu: "intel-core-i5-12400f", motherboard: "asus-prime-b760-plus" }),
  "warning",
  "displayOutput",
);

console.log(
  failures === 0 ? "\nAll compatibility checks passed." : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
