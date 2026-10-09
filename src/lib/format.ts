import type { Product, StockStatus } from "@/db/schema";
import type { SpecValue } from "@/db/schema";

/** Human-readable labels for the spec keys used across the catalog. */
const SPEC_LABELS: Record<string, string> = {
  boostClockGHz: "Boost clock",
  capacityGB: "Capacity",
  chipset: "Chipset",
  cores: "Cores",
  coolerType: "Type",
  driveType: "Type",
  efficiencyCert: "Efficiency",
  formFactor: "Form factor",
  formFactorSupport: "Supports",
  heightMm: "Height",
  integratedGraphics: "Integrated graphics",
  lengthMm: "Length",
  maxCoolerHeightMm: "Max cooler height",
  maxGpuLengthMm: "Max GPU length",
  maxMemoryGB: "Max memory",
  memoryType: "Memory",
  modular: "Modularity",
  moduleCount: "Modules",
  radiatorMm: "Radiator",
  readMbps: "Read speed",
  recommendedPsuW: "Recommended PSU",
  socket: "Socket",
  speedMHz: "Speed",
  supportedSockets: "Sockets",
  tdpRatingW: "Rated TDP",
  tdpW: "TDP",
  threads: "Threads",
  vramGB: "VRAM",
  wattageW: "Wattage",
};

const SPEC_UNITS: Array<[keySuffix: string, unit: string]> = [
  ["GHz", "GHz"],
  ["Mbps", "Mbit/s"],
  ["MHz", "MHz"],
  ["GB", "GB"],
  ["Mm", "mm"],
  ["W", "W"],
];

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatSpecKey(key: string): string {
  return (
    SPEC_LABELS[key] ??
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase())
      .trim()
  );
}

/** Formats a spec value for display, appending units implied by the key. */
export function formatSpec(value: SpecValue, key?: string): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && key) {
    const unit = SPEC_UNITS.find(([suffix]) => key.endsWith(suffix))?.[1];
    if (unit) return `${value} ${unit}`;
  }
  return String(value);
}

export const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

/** True when the product has a valid compare-at price above the sale price. */
export function isOnSale(
  product: Pick<Product, "priceCents" | "compareAtCents">,
): product is Pick<Product, "priceCents" | "compareAtCents"> & { compareAtCents: number } {
  return product.compareAtCents !== null && product.compareAtCents > product.priceCents;
}

/** Whole percent off (e.g. 10 for 10% off), or null when not on sale. */
export function percentOff(product: Pick<Product, "priceCents" | "compareAtCents">): number | null {
  const { compareAtCents, priceCents } = product;
  if (compareAtCents === null || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
