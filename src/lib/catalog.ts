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
  /** Gradient colors used for generated placeholder images. */
  accentFrom: string;
  accentTo: string;
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
    accentFrom: "#4f46e5",
    accentTo: "#9333ea",
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
    accentFrom: "#16a34a",
    accentTo: "#0d9488",
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
    accentFrom: "#0284c7",
    accentTo: "#4f46e5",
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
    accentFrom: "#d97706",
    accentTo: "#dc2626",
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
    accentFrom: "#0891b2",
    accentTo: "#2563eb",
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
    accentFrom: "#ca8a04",
    accentTo: "#ea580c",
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
    accentFrom: "#059669",
    accentTo: "#16a34a",
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
    accentFrom: "#475569",
    accentTo: "#0f172a",
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
