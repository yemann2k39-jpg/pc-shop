/**
 * Performance estimation from curated benchmark data.
 *
 * The dataset stores a RELATIVE performance index per GPU and CPU product
 * (higher = faster), approximated from published aggregate benchmark charts
 * (TechPowerUp GPU/CPU databases, aggregated gaming benchmarks, 2024–2025
 * data). Indices are not exact FPS numbers — the estimator converts them
 * into honest FPS *ranges* per resolution.
 *
 * Two scenarios:
 *   AAA Ultra  — typical modern AAA title, high/ultra settings
 *   Esports    — competitive titles (CS2/Valorant class), high settings
 * Each scenario has its own GPU baseline, resolution scaling, and (for
 * esports) its own CPU index table — X3D chips lead esports, while top
 * silicon shares AAA honors.
 *
 * Ranges are ±8% — estimates, never fake precision.
 */

import type { Product } from "@/db/schema";
import { CATEGORIES } from "@/lib/catalog";

export type Resolution = "1080p" | "1440p" | "4K";

export const RESOLUTIONS: Resolution[] = ["1080p", "1440p", "4K"];

export type Bottleneck = "GPU-bound" | "CPU-bound" | "Balanced";

export type PerfEstimate = {
  resolution: Resolution;
  fpsLow: number;
  fpsHigh: number;
  bottleneck: Bottleneck;
};

export type ScenarioName = "AAA Ultra" | "Esports";

export type BuildPerformance = {
  complete: boolean;
  scenarios: Array<{
    name: ScenarioName;
    estimates: PerfEstimate[];
  }>;
  notes: string[];
};

export const SOURCES = [
  "TechPowerUp GPU & CPU databases — relative performance charts",
  "Aggregated published gaming benchmarks (2024–2025)",
];

/** Relative GPU gaming index at 1440p ultra (RTX 4090 = 100). Key: product slug. */
const GPU_INDEX: Record<string, number> = {
  "asus-tuf-rtx-4090-oc": 100,
  "nvidia-founders-rtx-4070-ti-super": 64,
  "msi-gaming-x-slim-rtx-4070-super": 57,
  "sapphire-nitro-rx-7900-xtx": 74,
  "sapphire-pulse-rx-7800-xt": 52,
  "gigabyte-windforce-rtx-4060": 29,
  "powercolor-fighter-rx-7600": 27,
  "asrock-steel-legend-arc-b580": 34,
};

/** Relative CPU gaming index, AAA titles (Ryzen 7 7800X3D = 100). */
const CPU_INDEX_AAA: Record<string, number> = {
  "amd-ryzen-7-7800x3d": 100,
  "amd-ryzen-9-7950x": 86,
  "amd-ryzen-7-7700x": 85,
  "amd-ryzen-5-7600x": 79,
  "intel-core-i9-14900k": 100,
  "intel-core-i7-14700k": 98,
  "intel-core-i5-14600k": 93,
  "intel-core-i5-12400f": 66,
};

/** Relative CPU index for esports titles (X3D cache leads here). */
const CPU_INDEX_ESPORTS: Record<string, number> = {
  "amd-ryzen-7-7800x3d": 100,
  "amd-ryzen-9-7950x": 78,
  "amd-ryzen-7-7700x": 74,
  "amd-ryzen-5-7600x": 70,
  "intel-core-i9-14900k": 88,
  "intel-core-i7-14700k": 85,
  "intel-core-i5-14600k": 80,
  "intel-core-i5-12400f": 58,
};

/** FPS for a 100-index GPU at 1440p ultra (AAA average). */
const AAA = {
  base: 145,
  resGpu: { "1080p": 1.5, "1440p": 1.0, "4K": 0.55 },
  resCpu: { "1080p": 2.0, "1440p": 1.45, "4K": 1.2 },
} as const;

/** Esports baselines (fps for 100-index GPU / 100-index CPU per resolution). */
const ESPORTS = {
  gpuBase: 550,
  gpuExponent: 0.75,
  resGpu: { "1080p": 1.3, "1440p": 1.0, "4K": 0.6 },
  resCpu: { "1080p": 5.6, "1440p": 4.4, "4K": 2.6 },
} as const;

/** Assumed CPU when only a GPU is being estimated (modern 8-core class). */
const DEFAULT_CPU_INDEX = 90;
/** Assumed GPU for CPU-side estimates (RTX 4070 Super class). */
const DEFAULT_GPU_INDEX = 57;

export function hasGpuEstimate(slug: string): boolean {
  return slug in GPU_INDEX;
}

export function hasCpuEstimate(slug: string): boolean {
  return slug in CPU_INDEX_AAA;
}

function round(value: number): number {
  return Math.max(1, Math.round(value));
}

function classify(gpuFps: number, cpuCap: number): Bottleneck {
  const ratio = cpuCap / gpuFps;
  if (ratio < 0.88) return "GPU-bound";
  if (ratio > 1.12) return "CPU-bound";
  return "Balanced";
}

function estimate(
  gpuIndex: number,
  cpuIndex: number,
  mode: "aaa" | "esports",
): PerfEstimate[] {
  return RESOLUTIONS.map((resolution) => {
    let fps: number;
    let gpuFps: number;
    let cpuCap: number;
    if (mode === "aaa") {
      gpuFps = gpuIndex * AAA.base * AAA.resGpu[resolution];
      cpuCap = cpuIndex * AAA.resCpu[resolution];
      fps = Math.min(gpuFps, cpuCap);
    } else {
      gpuFps =
        Math.pow(gpuIndex / 100, ESPORTS.gpuExponent) *
        ESPORTS.gpuBase *
        ESPORTS.resGpu[resolution];
      cpuCap = cpuIndex * ESPORTS.resCpu[resolution];
      fps = Math.min(gpuFps, cpuCap);
    }
    return {
      resolution,
      fpsLow: round(fps * 0.92),
      fpsHigh: round(fps * 1.08),
      bottleneck: classify(gpuFps, cpuCap),
    };
  });
}

/**
 * Estimates for a GPU product. Assumes a modern mid-high CPU when none is
 * provided (noted in the methodology).
 */
export function estimateForGpu(
  gpu: Product,
  cpu?: Product,
): PerfEstimate[] | null {
  const gpuIndex = GPU_INDEX[gpu.slug];
  if (gpuIndex === undefined) return null;
  const cpuIndex = cpu
    ? (CPU_INDEX_AAA[cpu.slug] ?? DEFAULT_CPU_INDEX)
    : DEFAULT_CPU_INDEX;
  return estimate(gpuIndex, cpuIndex, "aaa");
}

/**
 * Estimates for a CPU product, assuming a mid-range GPU (RTX 4070 Super
 * class) — noted in the methodology.
 */
export function estimateForCpu(cpu: Product): PerfEstimate[] | null {
  const cpuIndex = CPU_INDEX_AAA[cpu.slug];
  if (cpuIndex === undefined) return null;
  return estimate(DEFAULT_GPU_INDEX, cpuIndex, "aaa");
}

/**
 * Whole-build estimates for BOTH scenarios. Returns `complete: false` until
 * every category is filled — RAM speed, cooling, and platform choices affect
 * real performance, so partial builds get no numbers.
 */
export function estimateForBuild(
  selection: Partial<Record<string, Product>>,
): BuildPerformance {
  const complete = CATEGORIES.every((c) => selection[c.slug]);
  if (!complete) {
    return { complete: false, scenarios: [], notes: [] };
  }

  const gpu = selection.gpu;
  const cpu = selection.cpu;
  const gpuIndex = gpu ? (GPU_INDEX[gpu.slug] ?? 0) : 0;
  const cpuAaa = cpu ? (CPU_INDEX_AAA[cpu.slug] ?? 0) : 0;
  const cpuEsports = cpu ? (CPU_INDEX_ESPORTS[cpu.slug] ?? 0) : 0;

  const notes: string[] = [];
  // DDR4 platforms trade a little performance even with the same parts.
  const ram = selection.ram;
  const ramType = ram ? (ram.specs.memoryType as string | undefined) : undefined;
  const ddr4 = ramType === "DDR4";
  if (ddr4) notes.push("DDR4 platform: estimates reduced ~8% vs DDR5.");
  notes.push("Cooling and case airflow affect sustained boost clocks — not modeled.");

  const factor = ddr4 ? 0.92 : 1;

  const scenarios = [
    {
      name: "AAA Ultra" as ScenarioName,
      estimates: estimate(gpuIndex * factor, cpuAaa * factor, "aaa"),
    },
    {
      name: "Esports" as ScenarioName,
      estimates: estimate(
        gpuIndex * factor,
        cpuEsports * factor,
        "esports",
      ),
    },
  ];

  return { complete: true, scenarios, notes };
}

export const BUILD_METHODOLOGY =
  "FPS ranges are estimates derived from relative benchmark indices (sources below), capped by the weaker of GPU/CPU. Real results vary by game, settings, resolution scaling, and drivers.";
