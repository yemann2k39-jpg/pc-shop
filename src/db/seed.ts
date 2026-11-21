/**
 * Seeds the catalog with realistic sample products and generates a
 * deterministic SVG placeholder image for each one.
 *
 * Usage: pnpm db:migrate && pnpm db:seed
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { count } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { CATEGORIES, getCategory } from "../lib/catalog";
import { categoryIllustration, ILLUSTRATION_ATTRS } from "../lib/illustrations";
import { productSvg } from "../lib/product-image";
import { DEFAULT_DB_PATH } from "./paths";
import { products, type StockStatus } from "./schema";

type SeedProduct = {
  category: string;
  brand: string;
  model: string;
  /** Price in US dollars (converted to cents on insert). */
  price: number;
  stock?: StockStatus;
  specs: Record<string, import("./schema").SpecValue>;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ------------------------------------------------------------------ */
/* Sample catalog                                                      */
/* ------------------------------------------------------------------ */

const PRODUCTS: SeedProduct[] = [
  // ---------------- CPUs ----------------
  {
    category: "cpu", brand: "AMD", model: "Ryzen 7 7800X3D", price: 399,
    specs: { socket: "AM5", cores: 8, threads: 16, boostClockGHz: 5.0, tdpW: 120, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "AMD", model: "Ryzen 5 7600X", price: 229,
    specs: { socket: "AM5", cores: 6, threads: 12, boostClockGHz: 5.3, tdpW: 105, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "AMD", model: "Ryzen 9 7950X", price: 549,
    specs: { socket: "AM5", cores: 16, threads: 32, boostClockGHz: 5.7, tdpW: 170, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "AMD", model: "Ryzen 7 7700X", price: 329,
    specs: { socket: "AM5", cores: 8, threads: 16, boostClockGHz: 5.4, tdpW: 105, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i5-14600K", price: 259,
    specs: { socket: "LGA1700", cores: 14, threads: 20, boostClockGHz: 5.3, tdpW: 125, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i7-14700K", price: 379,
    specs: { socket: "LGA1700", cores: 20, threads: 28, boostClockGHz: 5.6, tdpW: 125, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i9-14900K", price: 479,
    specs: { socket: "LGA1700", cores: 24, threads: 32, boostClockGHz: 6.0, tdpW: 125, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i5-12400F", price: 129,
    specs: { socket: "LGA1700", cores: 6, threads: 12, boostClockGHz: 4.4, tdpW: 65, integratedGraphics: false },
  },

  // ---------------- GPUs ----------------
  {
    category: "gpu", brand: "ASUS", model: "TUF RTX 4090 OC", price: 1599, stock: "low_stock",
    specs: { chipset: "GeForce RTX 4090", vramGB: 24, memoryType: "GDDR6X", lengthMm: 348, tdpW: 450, recommendedPsuW: 850 },
  },
  {
    category: "gpu", brand: "MSI", model: "Gaming X Slim RTX 4070 Super", price: 599,
    specs: { chipset: "GeForce RTX 4070 Super", vramGB: 12, memoryType: "GDDR6X", lengthMm: 250, tdpW: 220, recommendedPsuW: 650 },
  },
  {
    category: "gpu", brand: "Gigabyte", model: "Windforce RTX 4060", price: 299,
    specs: { chipset: "GeForce RTX 4060", vramGB: 8, memoryType: "GDDR6", lengthMm: 272, tdpW: 115, recommendedPsuW: 550 },
  },
  {
    category: "gpu", brand: "NVIDIA", model: "Founders RTX 4070 Ti Super", price: 799, stock: "out_of_stock",
    specs: { chipset: "GeForce RTX 4070 Ti Super", vramGB: 16, memoryType: "GDDR6X", lengthMm: 304, tdpW: 285, recommendedPsuW: 750 },
  },
  {
    category: "gpu", brand: "Sapphire", model: "Nitro+ RX 7900 XTX", price: 949,
    specs: { chipset: "Radeon RX 7900 XTX", vramGB: 24, memoryType: "GDDR6", lengthMm: 320, tdpW: 355, recommendedPsuW: 800 },
  },
  {
    category: "gpu", brand: "Sapphire", model: "Pulse RX 7800 XT", price: 499,
    specs: { chipset: "Radeon RX 7800 XT", vramGB: 16, memoryType: "GDDR6", lengthMm: 280, tdpW: 263, recommendedPsuW: 700 },
  },
  {
    category: "gpu", brand: "PowerColor", model: "Fighter RX 7600", price: 269,
    specs: { chipset: "Radeon RX 7600", vramGB: 8, memoryType: "GDDR6", lengthMm: 240, tdpW: 165, recommendedPsuW: 550 },
  },
  {
    category: "gpu", brand: "ASRock", model: "Steel Legend Arc B580", price: 249,
    specs: { chipset: "Intel Arc B580", vramGB: 12, memoryType: "GDDR6", lengthMm: 269, tdpW: 190, recommendedPsuW: 600 },
  },

  // ---------------- Motherboards ----------------
  {
    category: "motherboard", brand: "MSI", model: "MAG B650 Tomahawk WiFi", price: 219,
    specs: { socket: "AM5", chipset: "B650", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "ASUS", model: "ROG Strix B650E-F Gaming WiFi", price: 289,
    specs: { socket: "AM5", chipset: "B650E", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "Gigabyte", model: "B650M DS3H", price: 129,
    specs: { socket: "AM5", chipset: "B650", formFactor: "Micro-ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "ASRock", model: "X670E Pro RS", price: 309,
    specs: { socket: "AM5", chipset: "X670E", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "MSI", model: "PRO Z790-P WiFi", price: 239,
    specs: { socket: "LGA1700", chipset: "Z790", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "ASUS", model: "Prime B760-Plus", price: 149,
    specs: { socket: "LGA1700", chipset: "B760", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "Gigabyte", model: "B760M Aorus Elite AX", price: 179,
    specs: { socket: "LGA1700", chipset: "B760", formFactor: "Micro-ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "ASRock", model: "B760M Pro RS/D4", price: 119,
    specs: { socket: "LGA1700", chipset: "B760", formFactor: "Micro-ATX", memoryType: "DDR4", maxMemoryGB: 128 },
  },

  // ---------------- RAM ----------------
  {
    category: "ram", brand: "Corsair", model: "Vengeance 32GB DDR5-6000 CL30", price: 104,
    specs: { memoryType: "DDR5", capacityGB: 32, speedMHz: 6000, moduleCount: 2 },
  },
  {
    category: "ram", brand: "G.Skill", model: "Trident Z5 Neo 32GB DDR5-6000 CL30", price: 109,
    specs: { memoryType: "DDR5", capacityGB: 32, speedMHz: 6000, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Kingston", model: "Fury Beast 32GB DDR5-5600", price: 92,
    specs: { memoryType: "DDR5", capacityGB: 32, speedMHz: 5600, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Corsair", model: "Dominator Titanium 64GB DDR5-6400", price: 289,
    specs: { memoryType: "DDR5", capacityGB: 64, speedMHz: 6400, moduleCount: 2 },
  },
  {
    category: "ram", brand: "TeamGroup", model: "T-Force Delta RGB 32GB DDR5-6000", price: 99,
    specs: { memoryType: "DDR5", capacityGB: 32, speedMHz: 6000, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Corsair", model: "Vengeance LPX 32GB DDR4-3600", price: 79,
    specs: { memoryType: "DDR4", capacityGB: 32, speedMHz: 3600, moduleCount: 2 },
  },
  {
    category: "ram", brand: "G.Skill", model: "Ripjaws V 16GB DDR4-3200", price: 45,
    specs: { memoryType: "DDR4", capacityGB: 16, speedMHz: 3200, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Kingston", model: "Fury Beast 64GB DDR5-5600", price: 199,
    specs: { memoryType: "DDR5", capacityGB: 64, speedMHz: 5600, moduleCount: 2 },
  },

  // ---------------- Storage ----------------
  {
    category: "storage", brand: "Samsung", model: "990 Pro 2TB", price: 169,
    specs: { driveType: "NVMe SSD", capacityGB: 2000, readMbps: 7450 },
  },
  {
    category: "storage", brand: "Samsung", model: "980 1TB", price: 69,
    specs: { driveType: "NVMe SSD", capacityGB: 1000, readMbps: 3500 },
  },
  {
    category: "storage", brand: "WD", model: "Black SN850X 1TB", price: 89,
    specs: { driveType: "NVMe SSD", capacityGB: 1000, readMbps: 7300 },
  },
  {
    category: "storage", brand: "Crucial", model: "P3 Plus 1TB", price: 59,
    specs: { driveType: "NVMe SSD", capacityGB: 1000, readMbps: 5000 },
  },
  {
    category: "storage", brand: "Samsung", model: "990 Evo Plus 2TB", price: 139,
    specs: { driveType: "NVMe SSD", capacityGB: 2000, readMbps: 7250 },
  },
  {
    category: "storage", brand: "Crucial", model: "MX500 1TB", price: 74,
    specs: { driveType: "SATA SSD", capacityGB: 1000, readMbps: 560 },
  },
  {
    category: "storage", brand: "WD", model: "Blue 2TB HDD", price: 59,
    specs: { driveType: "HDD", capacityGB: 2000, readMbps: 180 },
  },
  {
    category: "storage", brand: "Seagate", model: "BarraCuda 4TB HDD", price: 79, stock: "low_stock",
    specs: { driveType: "HDD", capacityGB: 4000, readMbps: 190 },
  },

  // ---------------- PSUs ----------------
  {
    category: "psu", brand: "Corsair", model: "RM850x 850W", price: 139,
    specs: { wattageW: 850, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "Corsair", model: "RM1000x 1000W", price: 179,
    specs: { wattageW: 1000, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "Seasonic", model: "Focus GX-750", price: 109,
    specs: { wattageW: 750, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "be quiet!", model: "Pure Power 12 M 650W", price: 89,
    specs: { wattageW: 650, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "MSI", model: "MAG A850GL", price: 109,
    specs: { wattageW: 850, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "Cooler Master", model: "MWE Gold 750 V2", price: 99,
    specs: { wattageW: 750, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "EVGA", model: "600 BR", price: 54,
    specs: { wattageW: 600, efficiencyCert: "80 Plus Bronze", modular: "Non-modular" },
  },
  {
    category: "psu", brand: "Thermaltake", model: "Toughpower GX2 600W", price: 49,
    specs: { wattageW: 600, efficiencyCert: "80 Plus Gold", modular: "Non-modular" },
  },

  // ---------------- Coolers ----------------
  {
    category: "cooler", brand: "Noctua", model: "NH-D15 chromax.black", price: 119,
    specs: { coolerType: "Air", tdpRatingW: 220, heightMm: 165, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "Thermalright", model: "Peerless Assassin 120 SE", price: 35,
    specs: { coolerType: "Air", tdpRatingW: 245, heightMm: 155, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "DeepCool", model: "AK620", price: 64,
    specs: { coolerType: "Air", tdpRatingW: 260, heightMm: 160, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "Noctua", model: "NH-U12S redux", price: 49,
    specs: { coolerType: "Air", tdpRatingW: 180, heightMm: 158, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "be quiet!", model: "Dark Rock Pro 5", price: 99,
    specs: { coolerType: "Air", tdpRatingW: 270, heightMm: 168, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "Corsair", model: "iCUE H100i Elite LCD 240", price: 289,
    specs: { coolerType: "AIO", tdpRatingW: 300, radiatorMm: 240, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "Arctic", model: "Liquid Freezer III 360", price: 129,
    specs: { coolerType: "AIO", tdpRatingW: 350, radiatorMm: 360, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "NZXT", model: "Kraken 240 RGB", price: 149,
    specs: { coolerType: "AIO", tdpRatingW: 250, radiatorMm: 240, supportedSockets: ["AM5", "LGA1700"] },
  },

  // ---------------- Cases ----------------
  {
    category: "case", brand: "NZXT", model: "H5 Flow", price: 94,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 365, maxCoolerHeightMm: 165 },
  },
  {
    category: "case", brand: "Lian Li", model: "Lancool 216", price: 104,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 392, maxCoolerHeightMm: 180 },
  },
  {
    category: "case", brand: "Fractal Design", model: "North", price: 129,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 355, maxCoolerHeightMm: 170 },
  },
  {
    category: "case", brand: "Corsair", model: "4000D Airflow", price: 104,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 360, maxCoolerHeightMm: 170 },
  },
  {
    category: "case", brand: "Phanteks", model: "XT Pro Ultra", price: 89,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 400, maxCoolerHeightMm: 170 },
  },
  {
    category: "case", brand: "Montech", model: "AIR 903 MAX", price: 69,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 380, maxCoolerHeightMm: 175 },
  },
  {
    category: "case", brand: "Cooler Master", model: "NR200", price: 80,
    specs: { formFactorSupport: ["Mini-ITX"], maxGpuLengthMm: 330, maxCoolerHeightMm: 155 },
  },
  {
    category: "case", brand: "Fractal Design", model: "Pop Mini Silent", price: 109, stock: "out_of_stock",
    specs: { formFactorSupport: ["Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 365, maxCoolerHeightMm: 170 },
  },

  /* ---------------------------------------------------------------- */
  /* Catalog expansion (round 2) — budget to halo options per category */
  /* ---------------------------------------------------------------- */

  // CPUs (more)
  {
    category: "cpu", brand: "AMD", model: "Ryzen 5 8600G", price: 189,
    specs: { socket: "AM5", cores: 6, threads: 12, boostClockGHz: 5.0, tdpW: 65, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "AMD", model: "Ryzen 7 9700X", price: 359,
    specs: { socket: "AM5", cores: 8, threads: 16, boostClockGHz: 5.5, tdpW: 65, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "AMD", model: "Ryzen 9 9950X", price: 649,
    specs: { socket: "AM5", cores: 16, threads: 32, boostClockGHz: 5.7, tdpW: 170, integratedGraphics: true },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i3-12100F", price: 94,
    specs: { socket: "LGA1700", cores: 4, threads: 8, boostClockGHz: 4.3, tdpW: 58, integratedGraphics: false },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i5-13400F", price: 179,
    specs: { socket: "LGA1700", cores: 10, threads: 16, boostClockGHz: 4.6, tdpW: 65, integratedGraphics: false },
  },
  {
    category: "cpu", brand: "Intel", model: "Core i7-13700K", price: 339,
    specs: { socket: "LGA1700", cores: 16, threads: 24, boostClockGHz: 5.4, tdpW: 125, integratedGraphics: true },
  },

  // GPUs (more)
  {
    category: "gpu", brand: "ASUS", model: "Dual RTX 4060 Ti", price: 399,
    specs: { chipset: "GeForce RTX 4060 Ti", vramGB: 8, memoryType: "GDDR6", lengthMm: 242, tdpW: 160, recommendedPsuW: 600 },
  },
  {
    category: "gpu", brand: "Gigabyte", model: "Gaming OC RTX 4070", price: 549,
    specs: { chipset: "GeForce RTX 4070", vramGB: 12, memoryType: "GDDR6X", lengthMm: 295, tdpW: 200, recommendedPsuW: 650 },
  },
  {
    category: "gpu", brand: "Zotac", model: "Trinity RTX 5080", price: 1149, stock: "low_stock",
    specs: { chipset: "GeForce RTX 5080", vramGB: 16, memoryType: "GDDR7", lengthMm: 304, tdpW: 360, recommendedPsuW: 850 },
  },
  {
    category: "gpu", brand: "ASUS", model: "TUF RTX 5090", price: 2299, stock: "low_stock",
    specs: { chipset: "GeForce RTX 5090", vramGB: 32, memoryType: "GDDR7", lengthMm: 347, tdpW: 575, recommendedPsuW: 1000 },
  },
  {
    category: "gpu", brand: "XFX", model: "Speedster SWFT 210 RX 7700 XT", price: 429,
    specs: { chipset: "Radeon RX 7700 XT", vramGB: 12, memoryType: "GDDR6", lengthMm: 310, tdpW: 245, recommendedPsuW: 700 },
  },
  {
    category: "gpu", brand: "ASRock", model: "Challenger RX 7600 XT", price: 329,
    specs: { chipset: "Radeon RX 7600 XT", vramGB: 16, memoryType: "GDDR6", lengthMm: 279, tdpW: 190, recommendedPsuW: 600 },
  },

  // Motherboards (more)
  {
    category: "motherboard", brand: "ASRock", model: "B650M-HDV/M.2", price: 89,
    specs: { socket: "AM5", chipset: "B650", formFactor: "Micro-ATX", memoryType: "DDR5", maxMemoryGB: 96 },
  },
  {
    category: "motherboard", brand: "Gigabyte", model: "X870E Aorus Elite", price: 329,
    specs: { socket: "AM5", chipset: "X870E", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "MSI", model: "PRO B650M-P", price: 99,
    specs: { socket: "AM5", chipset: "B650", formFactor: "Micro-ATX", memoryType: "DDR5", maxMemoryGB: 128 },
  },
  {
    category: "motherboard", brand: "Gigabyte", model: "Z790 D DDR4", price: 169,
    specs: { socket: "LGA1700", chipset: "Z790", formFactor: "ATX", memoryType: "DDR4", maxMemoryGB: 128 },
  },
  {
    category: "motherboard", brand: "ASUS", model: "TUF Gaming Z790-Plus WiFi", price: 289,
    specs: { socket: "LGA1700", chipset: "Z790", formFactor: "ATX", memoryType: "DDR5", maxMemoryGB: 192 },
  },
  {
    category: "motherboard", brand: "ASUS", model: "Prime H610M-E D4", price: 79,
    specs: { socket: "LGA1700", chipset: "H610", formFactor: "Micro-ATX", memoryType: "DDR4", maxMemoryGB: 64 },
  },

  // RAM (more)
  {
    category: "ram", brand: "G.Skill", model: "Flare X5 32GB DDR5-6000 CL30", price: 99,
    specs: { memoryType: "DDR5", capacityGB: 32, speedMHz: 6000, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Kingston", model: "Fury Beast 16GB DDR5-5600", price: 49,
    specs: { memoryType: "DDR5", capacityGB: 16, speedMHz: 5600, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Corsair", model: "Vengeance 96GB DDR5-5600", price: 299,
    specs: { memoryType: "DDR5", capacityGB: 96, speedMHz: 5600, moduleCount: 2 },
  },
  {
    category: "ram", brand: "TeamGroup", model: "Vulcan 16GB DDR4-3200", price: 36,
    specs: { memoryType: "DDR4", capacityGB: 16, speedMHz: 3200, moduleCount: 2 },
  },
  {
    category: "ram", brand: "Crucial", model: "Pro 64GB DDR4-3200", price: 109,
    specs: { memoryType: "DDR4", capacityGB: 64, speedMHz: 3200, moduleCount: 2 },
  },

  // Storage (more)
  {
    category: "storage", brand: "WD", model: "Black SN770 2TB", price: 119,
    specs: { driveType: "NVMe SSD", capacityGB: 2000, readMbps: 5150 },
  },
  {
    category: "storage", brand: "Crucial", model: "T500 2TB", price: 139,
    specs: { driveType: "NVMe SSD", capacityGB: 2000, readMbps: 7400 },
  },
  {
    category: "storage", brand: "Kingston", model: "NV3 1TB", price: 55,
    specs: { driveType: "NVMe SSD", capacityGB: 1000, readMbps: 6000 },
  },
  {
    category: "storage", brand: "Seagate", model: "IronWolf 8TB HDD", price: 179,
    specs: { driveType: "HDD", capacityGB: 8000, readMbps: 210 },
  },
  {
    category: "storage", brand: "WD", model: "Black 6TB HDD", price: 219, stock: "low_stock",
    specs: { driveType: "HDD", capacityGB: 6000, readMbps: 250 },
  },

  // PSUs (more)
  {
    category: "psu", brand: "Corsair", model: "RM750e 750W", price: 99,
    specs: { wattageW: 750, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "Seasonic", model: "Focus GX-1000", price: 169,
    specs: { wattageW: 1000, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "be quiet!", model: "Pure Power 12 M 850W", price: 119,
    specs: { wattageW: 850, efficiencyCert: "80 Plus Gold", modular: "Fully modular" },
  },
  {
    category: "psu", brand: "Thermaltake", model: "Smart 500W", price: 39,
    specs: { wattageW: 500, efficiencyCert: "80 Plus White", modular: "Non-modular" },
  },
  {
    category: "psu", brand: "Corsair", model: "HX1500i 1500W", price: 389, stock: "low_stock",
    specs: { wattageW: 1500, efficiencyCert: "80 Plus Platinum", modular: "Fully modular" },
  },

  // Coolers (more)
  {
    category: "cooler", brand: "Thermalright", model: "Burst Assassin 120", price: 39,
    specs: { coolerType: "Air", tdpRatingW: 220, heightMm: 155, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "Noctua", model: "NH-L9a-AM5", price: 55,
    specs: { coolerType: "Air", tdpRatingW: 100, heightMm: 37, supportedSockets: ["AM5"] },
  },
  {
    category: "cooler", brand: "DeepCool", model: "LE520", price: 30,
    specs: { coolerType: "Air", tdpRatingW: 180, heightMm: 157, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "Arctic", model: "Liquid Freezer III 240", price: 99,
    specs: { coolerType: "AIO", tdpRatingW: 300, radiatorMm: 240, supportedSockets: ["AM5", "LGA1700"] },
  },
  {
    category: "cooler", brand: "NZXT", model: "Kraken Elite 360 RGB", price: 299,
    specs: { coolerType: "AIO", tdpRatingW: 350, radiatorMm: 360, supportedSockets: ["AM5", "LGA1700"] },
  },

  // Cases (more)
  {
    category: "case", brand: "Fractal Design", model: "Pop Air RGB", price: 89,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 380, maxCoolerHeightMm: 170 },
  },
  {
    category: "case", brand: "Lian Li", model: "O11 Dynamic EVO", price: 169,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 423, maxCoolerHeightMm: 167 },
  },
  {
    category: "case", brand: "be quiet!", model: "Pure Base 500DX", price: 99,
    specs: { formFactorSupport: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 370, maxCoolerHeightMm: 175 },
  },
  {
    category: "case", brand: "Cooler Master", model: "NR200P", price: 99,
    specs: { formFactorSupport: ["Mini-ITX"], maxGpuLengthMm: 330, maxCoolerHeightMm: 155 },
  },
  {
    category: "case", brand: "Montech", model: "XR Pro", price: 59,
    specs: { formFactorSupport: ["ATX", "Micro-ATX"], maxGpuLengthMm: 380, maxCoolerHeightMm: 165 },
  },
];

/* ------------------------------------------------------------------ */
/* Placeholder image generation                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Seed                                                               */
/* ------------------------------------------------------------------ */

/** Standalone illustration tile used on the home page (transparent bg). */
function categorySvg(categorySlug: string, accent: string): string {
  const illustration = categoryIllustration(categorySlug, accent) ?? "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" aria-hidden="true">
  <g ${ILLUSTRATION_ATTRS}>${illustration}</g>
</svg>
`;
}


const dbPath = process.env.DATABASE_PATH ?? path.resolve(DEFAULT_DB_PATH);
mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

const db = drizzle(sqlite);

const tableExists = sqlite
  .prepare<[], { name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products'",
  )
  .get();
if (!tableExists) {
  console.error(
    "The products table does not exist yet. Run `pnpm db:migrate` first.",
  );
  process.exit(1);
}

// Fail fast on bad category slugs or missing illustrations before touching
// the database.
for (const product of PRODUCTS) {
  const category = getCategory(product.category);
  if (!category || !categoryIllustration(product.category, category.accent)) {
    console.error(
      `Unknown category "${product.category}" for product ${product.brand} ${product.model}. ` +
        `Valid slugs: ${CATEGORIES.map((c) => c.slug).join(", ")}`,
    );
    process.exit(1);
  }
}

const imageDir = path.resolve("public", "images", "products");

const seed = sqlite.transaction(() => {
  db.delete(products).run();
  // Reset autoincrement ids so reseeds produce stable rows.
  sqlite.exec("DELETE FROM sqlite_sequence WHERE name = 'products'");

  for (const product of PRODUCTS) {
    const slug = slugify(`${product.brand} ${product.model}`);
    // Deterministic pseudo-popularity so "Best selling" has stable demo data.
    const popularity =
      5 + (slug.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 76);
    db.insert(products)
      .values({
        slug,
        category: product.category,
        brand: product.brand,
        model: product.model,
        priceCents: Math.round(product.price * 100),
        popularity,
        stockStatus: product.stock ?? "in_stock",
        imageUrl: `/images/products/${slug}.svg`,
        specs: product.specs,
      })
      .run();
  }
});

seed();

// Files are written after the transaction commits so a rollback can never
// leave the database and the images out of sync. The directory is cleared
// first so removed products do not leave stale files behind.
rmSync(imageDir, { recursive: true, force: true });
mkdirSync(imageDir, { recursive: true });
for (const product of PRODUCTS) {
  const slug = slugify(`${product.brand} ${product.model}`);
  writeFileSync(
    path.join(imageDir, `${slug}.svg`),
    productSvg(product.category, product.brand, product.model),
  );
}

// Per-category illustration tiles for the home page.
const categoryDir = path.resolve("public", "images", "categories");
rmSync(categoryDir, { recursive: true, force: true });
mkdirSync(categoryDir, { recursive: true });
for (const category of CATEGORIES) {
  writeFileSync(
    path.join(categoryDir, `${category.slug}.svg`),
    categorySvg(category.slug, category.accent),
  );
}

const [countRow] = db.select({ value: count() }).from(products).all();
console.log(
  `Seeded ${countRow?.value ?? 0} products into ${dbPath} (+${CATEGORIES.length} category tiles)`,
);

sqlite.close();
