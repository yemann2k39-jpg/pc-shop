/**
 * Catalog taxonomy: the fixed set of PC-component categories this shop sells.
 *
 * This config is the single source of truth shared by the seed script, the
 * UI, and (later) the filtering system. Categories are intentionally a
 * code-level enum rather than a database table — the taxonomy is part of the
 * product, not user data.
 */

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
};

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: "cpu",
    name: "Processors",
    tagline: "CPUs for gaming and productivity",
    accentFrom: "#4f46e5",
    accentTo: "#9333ea",
    cardSpecs: ["cores", "threads", "socket"],
  },
  {
    slug: "gpu",
    name: "Graphics Cards",
    tagline: "GPUs for every resolution and budget",
    accentFrom: "#16a34a",
    accentTo: "#0d9488",
    cardSpecs: ["vramGB", "chipset"],
  },
  {
    slug: "motherboard",
    name: "Motherboards",
    tagline: "Boards for AM5 and LGA1700",
    accentFrom: "#0284c7",
    accentTo: "#4f46e5",
    cardSpecs: ["socket", "formFactor"],
  },
  {
    slug: "ram",
    name: "Memory",
    tagline: "DDR4 and DDR5 memory kits",
    accentFrom: "#d97706",
    accentTo: "#dc2626",
    cardSpecs: ["capacityGB", "speedMHz"],
  },
  {
    slug: "storage",
    name: "Storage",
    tagline: "NVMe, SATA SSDs, and hard drives",
    accentFrom: "#0891b2",
    accentTo: "#2563eb",
    cardSpecs: ["driveType", "capacityGB"],
  },
  {
    slug: "psu",
    name: "Power Supplies",
    tagline: "Reliable PSUs with headroom to spare",
    accentFrom: "#ca8a04",
    accentTo: "#ea580c",
    cardSpecs: ["wattageW", "efficiencyCert"],
  },
  {
    slug: "cooler",
    name: "CPU Coolers",
    tagline: "Air and AIO cooling for any socket",
    accentFrom: "#059669",
    accentTo: "#16a34a",
    cardSpecs: ["coolerType", "tdpRatingW"],
  },
  {
    slug: "case",
    name: "Cases",
    tagline: "Airflow-focused enclosures",
    accentFrom: "#475569",
    accentTo: "#0f172a",
    cardSpecs: ["formFactorSupport", "maxGpuLengthMm"],
  },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): CategoryConfig | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}
