/**
 * Catalog taxonomy: the fixed set of PC-component categories this shop sells.
 *
 * This config is the single source of truth shared by the seed script, the
 * UI, and the filtering system. Categories are intentionally a code-level
 * enum rather than a database table — the taxonomy is part of the product,
 * not user data.
 */

/** A per-category spec filter shown in the listing sidebar. */
export type CategoryFilter =
  | { kind: "enum"; key: string; label: string }
  | { kind: "numberMin"; key: string; label: string; unit?: string };

export type CategoryConfig = {
  /** URL slug, e.g. "cpu" */
  slug: string;
  /** Plural display name, e.g. "Processors" */
  name: string;
  /** One-line description used on the home page. */
  tagline: string;
  /** Category identity color (hex) used in illustrations. */
  accent: string;
  /** Tailwind background class for the home page tile (soft tint). */
  tileClass: string;
  /** Spec keys shown on product cards, in order. */
  cardSpecs: string[];
  /** Faceted filters offered on the category page. */
  filters: CategoryFilter[];
};

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: "cpu",
    name: "Processors",
    tagline: "CPUs for gaming and productivity",
    accent: "#1d4ed8",
    tileClass: "bg-blue-50",
    cardSpecs: ["cores", "threads", "socket"],
    filters: [
      { kind: "enum", key: "socket", label: "Socket" },
      { kind: "numberMin", key: "cores", label: "Cores (min)" },
    ],
  },
  {
    slug: "gpu",
    name: "Graphics Cards",
    tagline: "GPUs for every resolution and budget",
    accent: "#6d28d9",
    tileClass: "bg-violet-50",
    cardSpecs: ["vramGB", "chipset"],
    filters: [
      { kind: "enum", key: "chipset", label: "Chipset" },
      { kind: "numberMin", key: "vramGB", label: "VRAM (min)", unit: "GB" },
    ],
  },
  {
    slug: "motherboard",
    name: "Motherboards",
    tagline: "Boards for AM5 and LGA1700",
    accent: "#0e7490",
    tileClass: "bg-cyan-50",
    cardSpecs: ["socket", "formFactor"],
    filters: [
      { kind: "enum", key: "socket", label: "Socket" },
      { kind: "enum", key: "formFactor", label: "Form factor" },
      { kind: "enum", key: "memoryType", label: "Memory type" },
    ],
  },
  {
    slug: "ram",
    name: "Memory",
    tagline: "DDR4 and DDR5 memory kits",
    accent: "#b45309",
    tileClass: "bg-amber-50",
    cardSpecs: ["capacityGB", "speedMHz"],
    filters: [
      { kind: "enum", key: "memoryType", label: "Memory type" },
      { kind: "numberMin", key: "capacityGB", label: "Capacity (min)", unit: "GB" },
    ],
  },
  {
    slug: "storage",
    name: "Storage",
    tagline: "NVMe, SATA SSDs, and hard drives",
    accent: "#0f766e",
    tileClass: "bg-teal-50",
    cardSpecs: ["driveType", "capacityGB"],
    filters: [
      { kind: "enum", key: "driveType", label: "Drive type" },
      { kind: "numberMin", key: "capacityGB", label: "Capacity (min)", unit: "GB" },
    ],
  },
  {
    slug: "psu",
    name: "Power Supplies",
    tagline: "Reliable PSUs with headroom to spare",
    accent: "#c2410c",
    tileClass: "bg-orange-50",
    cardSpecs: ["wattageW", "efficiencyCert"],
    filters: [
      { kind: "numberMin", key: "wattageW", label: "Wattage (min)", unit: "W" },
      { kind: "enum", key: "efficiencyCert", label: "Efficiency" },
    ],
  },
  {
    slug: "cooler",
    name: "CPU Coolers",
    tagline: "Air and AIO cooling for any socket",
    accent: "#be123c",
    tileClass: "bg-rose-50",
    cardSpecs: ["coolerType", "tdpRatingW"],
    filters: [
      { kind: "enum", key: "coolerType", label: "Cooler type" },
      { kind: "numberMin", key: "tdpRatingW", label: "Rated TDP (min)", unit: "W" },
    ],
  },
  {
    slug: "case",
    name: "Cases",
    tagline: "Airflow-focused enclosures",
    accent: "#475569",
    tileClass: "bg-slate-100",
    cardSpecs: ["formFactorSupport", "maxGpuLengthMm"],
    filters: [
      { kind: "enum", key: "formFactorSupport", label: "Supports" },
      { kind: "numberMin", key: "maxGpuLengthMm", label: "Max GPU length (min)", unit: "mm" },
    ],
  },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): CategoryConfig | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

/** Neutral fallback for rows whose category slug is not in the config. */
export const FALLBACK_CATEGORY: CategoryConfig = {
  slug: "",
  name: "Products",
  tagline: "",
  accent: "#52525b",
  tileClass: "bg-zinc-100",
  cardSpecs: [],
  filters: [],
};
