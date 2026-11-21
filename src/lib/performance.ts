/**
 * Performance estimation from real benchmark data.
 *
 * Primary path: the seeded `benchmark_data` table holds MEASURED aggregate
 * FPS (TechPowerUp game database averages per GPU per resolution; GPUCheck
 * 1080p CPU ceilings). FPS for a pairing = min(GPU fps, CPU cap) per
 * resolution — the same model GPUCheck/PC-Builds use.
 *
 * Fallback path: the legacy hand-tuned relative indices, used when a part
 * has no benchmark rows (e.g. newly added catalog items).
 *
 * Ranges: ±8% for complete builds, ±15% for partial (GPU+CPU only).
 */

import type { Product } from "@/db/schema";
import { CATEGORIES } from "@/lib/catalog";

/** Serializable benchmark lookup passed from the server to the client. */
export type BenchmarkLookup = {
  /** gpu[scenario]["slug@resolution"] -> avg fps. */
  gpu: Record<string, Record<string, number>>;
  /** cpu[scenario][slug] -> avg fps (1080p ceiling, applies at all resolutions). */
  cpu: Record<string, Record<string, number>>;
};

export function buildBenchmarkLookup(
  rows: Array<{
    slug: string;
    kind: "gpu" | "cpu";
    scenario: string;
    resolution: string | null;
    avgFps: number;
  }>,
): BenchmarkLookup {
  const lookup: BenchmarkLookup = { gpu: {}, cpu: {} };
  for (const row of rows) {
    if (row.kind === "gpu" && row.resolution) {
      lookup.gpu[row.scenario] ??= {};
      lookup.gpu[row.scenario][`${row.slug}@${row.resolution}`] = row.avgFps;
    } else if (row.kind === "cpu") {
      lookup.cpu[row.scenario] ??= {};
      lookup.cpu[row.scenario][row.slug] = row.avgFps;
    }
  }
  return lookup;
}

export type Resolution = "1080p" | "1440p" | "4K";

export const RESOLUTIONS: Resolution[] = ["1080p", "1440p", "4K"];

export type Bottleneck = "GPU-bound" | "CPU-bound" | "Balanced";

export type PerfEstimate = {
  resolution: Resolution;
  fpsLow: number;
  fpsHigh: number;
  bottleneck: Bottleneck;
  /** Positive = CPU is limiting the GPU by this % (0 when GPU-bound). */
  cpuLimitPct: number;
};

export type ScenarioName = "AAA Ultra" | "Esports";

export type BuildPerformance = {
  complete: boolean;
  /** True when estimates come from the measured benchmark table. */
  measured: boolean;
  scenarios: Array<{
    name: ScenarioName;
    estimates: PerfEstimate[];
  }>;
  notes: string[];
};

export const SOURCES = [
  "TechPowerUp game FPS database — measured averages per GPU and resolution",
  "GPUCheck — measured CPU 1080p ceilings (paired with an RTX 4090)",
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

/** Approximate AAA bottleneck % of the GPU held back by the CPU (0 if none). */
export function approximateBottleneckPct(
  gpuSlug: string,
  cpuSlug: string,
): number {
  const gpuIndex = GPU_INDEX[gpuSlug];
  const cpuIndex = CPU_INDEX_AAA[cpuSlug];
  if (!gpuIndex || !cpuIndex) return 0;
  const gpuFps = (gpuIndex / 100) * AAA.base * AAA.resGpu["1080p"];
  const cpuCap = cpuIndex * AAA.resCpu["1080p"];
  if (cpuCap >= gpuFps) return 0;
  return Math.round((1 - cpuCap / gpuFps) * 100);
}

export function isHighEndGpu(slug: string): boolean {
  return (GPU_INDEX[slug] ?? 0) >= 64;
}

export function isWeakCpu(slug: string): boolean {
  return (CPU_INDEX_AAA[slug] ?? 100) <= 80;
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

function toEstimate(
  resolution: Resolution,
  gpuFps: number,
  cpuCap: number,
  rangePct: number,
): PerfEstimate {
  const fps = Math.min(gpuFps, cpuCap);
  const cpuLimitPct =
    cpuCap < gpuFps ? Math.round((1 - cpuCap / gpuFps) * 100) : 0;
  return {
    resolution,
    fpsLow: round(fps * (1 - rangePct)),
    fpsHigh: round(fps * (1 + rangePct)),
    bottleneck: classify(gpuFps, cpuCap),
    cpuLimitPct,
  };
}

function estimate(
  gpuIndex: number,
  cpuIndex: number,
  mode: "aaa" | "esports",
): PerfEstimate[] {
  return RESOLUTIONS.map((resolution) => {
    let gpuFps: number;
    let cpuCap: number;
    if (mode === "aaa") {
      gpuFps = (gpuIndex / 100) * AAA.base * AAA.resGpu[resolution];
      cpuCap = cpuIndex * AAA.resCpu[resolution];
    } else {
      gpuFps =
        Math.pow(gpuIndex / 100, ESPORTS.gpuExponent) *
        ESPORTS.gpuBase *
        ESPORTS.resGpu[resolution];
      cpuCap = cpuIndex * ESPORTS.resCpu[resolution];
    }
    return toEstimate(resolution, gpuFps, cpuCap, 0.08);
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
 * Whole-build estimates for BOTH scenarios, from measured benchmark data.
 *
 * - Complete build (all 8 parts): ±8% ranges.
 * - Partial build with GPU + CPU chosen: ±15% ranges so users get early
 *   guidance while picking parts.
 * - Parts without benchmark rows fall back to the legacy index tables.
 */
export function estimateForBuild(
  selection: Partial<Record<string, Product>>,
  benchmarks?: BenchmarkLookup,
): BuildPerformance {
  const complete = CATEGORIES.every((c) => selection[c.slug]);
  const gpu = selection.gpu;
  const cpu = selection.cpu;
  if (!complete && (!gpu || !cpu)) {
    return { complete: false, measured: false, scenarios: [], notes: [] };
  }

  const notes: string[] = [];
  // DDR4 platforms trade a little performance even with the same parts.
  const ram = selection.ram;
  const ramType = ram ? (ram.specs.memoryType as string | undefined) : undefined;
  const ddr4 = ramType === "DDR4";
  if (ddr4) notes.push("DDR4 platform: estimates reduced ~8% vs DDR5.");
  notes.push("Cooling and case airflow affect sustained boost clocks — not modeled.");

  const factor = ddr4 ? 0.92 : 1;
  const rangePct = complete ? 0.08 : 0.15;
  const measured = Boolean(benchmarks);

  const scenarioNames: Array<{ name: ScenarioName; mode: "aaa" | "esports" }> = [
    { name: "AAA Ultra", mode: "aaa" },
    { name: "Esports", mode: "esports" },
  ];

  const scenarios = scenarioNames.map(({ name, mode }) => ({
    name,
    estimates: RESOLUTIONS.map((resolution) => {
      let gpuFps: number;
      let cpuCap: number;
      if (benchmarks) {
        gpuFps = (benchmarks.gpu[mode]?.[`${gpu!.slug}@${resolution}`] ?? 0) * factor;
        cpuCap = (benchmarks.cpu[mode]?.[cpu!.slug] ?? 0) * factor;
        // Legacy fallback for parts missing from the benchmark table.
        if (gpuFps === 0)
          gpuFps =
            ((GPU_INDEX[gpu!.slug] ?? 0) / 100) *
            (mode === "aaa"
              ? AAA.base * AAA.resGpu[resolution]
              : Math.pow((GPU_INDEX[gpu!.slug] ?? 0) / 100, ESPORTS.gpuExponent) * ESPORTS.gpuBase * ESPORTS.resGpu[resolution]) *
            factor;
        if (cpuCap === 0)
          cpuCap =
            ((mode === "aaa" ? CPU_INDEX_AAA[cpu!.slug] : CPU_INDEX_ESPORTS[cpu!.slug]) ?? 0) *
            (mode === "aaa" ? AAA.resCpu[resolution] : ESPORTS.resCpu[resolution]) *
            factor;
      } else {
        gpuFps =
          ((GPU_INDEX[gpu!.slug] ?? 0) / 100) *
          (mode === "aaa"
            ? AAA.base * AAA.resGpu[resolution]
            : Math.pow((GPU_INDEX[gpu!.slug] ?? 0) / 100, ESPORTS.gpuExponent) * ESPORTS.gpuBase * ESPORTS.resGpu[resolution]) *
          factor;
        cpuCap =
          ((mode === "aaa" ? CPU_INDEX_AAA[cpu!.slug] : CPU_INDEX_ESPORTS[cpu!.slug]) ?? 0) *
          (mode === "aaa" ? AAA.resCpu[resolution] : ESPORTS.resCpu[resolution]) *
          factor;
      }
      return toEstimate(resolution, gpuFps, cpuCap, rangePct);
    }),
  }));

  return { complete, measured, scenarios, notes };
}

export const BUILD_METHODOLOGY =
  "FPS ranges come from measured benchmark data (see sources), combined as min(GPU fps, CPU cap) per resolution. Real results vary by game, settings, and drivers.";
