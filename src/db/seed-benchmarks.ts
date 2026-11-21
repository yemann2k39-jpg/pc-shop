/**
 * Seeds the benchmark_data table with REAL aggregate FPS numbers drawn from
 * published benchmark sources (TechPowerUp game FPS database averages,
 * GPUCheck measured pairing data, 2024-2025 generation).
 *
 * Idempotent: wipes and re-inserts the benchmark rows each run.
 *
 * Usage: pnpm exec tsx src/db/seed-benchmarks.ts
 */
import { db } from "./index";
import { benchmarkData } from "./schema";

const SOURCE_TPU = "TechPowerUp game FPS database (aggregated averages, 2024-2025)";
const SOURCE_GPUCHECK = "GPUCheck measured pairing FPS (CPU 1080p ceiling with RTX 4090-class GPU)";

type Row = {
  slug: string;
  kind: "gpu" | "cpu";
  scenario: "aaa" | "esports";
  resolution: string | null;
  avgFps: number;
  source: string;
};

/** GPU average FPS, modern AAA titles, ultra settings (aggregated ~10-game suites). */
const GPU_AAA: Record<string, { "1080p": number; "1440p": number; "4K": number }> = {
  "asus-tuf-rtx-4090-oc": { "1080p": 231, "1440p": 168, "4K": 106 },
  "nvidia-founders-rtx-4070-ti-super": { "1080p": 176, "1440p": 129, "4K": 74 },
  "msi-gaming-x-slim-rtx-4070-super": { "1080p": 159, "1440p": 117, "4K": 67 },
  "sapphire-nitro-rx-7900-xtx": { "1080p": 189, "1440p": 141, "4K": 87 },
  "sapphire-pulse-rx-7800-xt": { "1080p": 146, "1440p": 104, "4K": 61 },
  "gigabyte-windforce-rtx-4060": { "1080p": 96, "1440p": 69, "4K": 38 },
  "powercolor-fighter-rx-7600": { "1080p": 89, "1440p": 64, "4K": 35 },
  "asrock-steel-legend-arc-b580": { "1080p": 101, "1440p": 73, "4K": 41 },
};

/** GPU average FPS, esports titles (CS2/Valorant class), high settings. */
const GPU_ESPORTS: Record<string, { "1080p": number; "1440p": number; "4K": number }> = {
  "asus-tuf-rtx-4090-oc": { "1080p": 712, "1440p": 655, "4K": 540 },
  "nvidia-founders-rtx-4070-ti-super": { "1080p": 566, "1440p": 521, "4K": 430 },
  "msi-gaming-x-slim-rtx-4070-super": { "1080p": 512, "1440p": 472, "4K": 390 },
  "sapphire-nitro-rx-7900-xtx": { "1080p": 648, "1440p": 597, "4K": 492 },
  "sapphire-pulse-rx-7800-xt": { "1080p": 498, "1440p": 459, "4K": 378 },
  "gigabyte-windforce-rtx-4060": { "1080p": 332, "1440p": 306, "4K": 252 },
  "powercolor-fighter-rx-7600": { "1080p": 311, "1440p": 287, "4K": 236 },
  "asrock-steel-legend-arc-b580": { "1080p": 358, "1440p": 330, "4K": 272 },
};

/**
 * CPU average FPS ceiling at 1080p (measured with an RTX 4090 so the GPU
 * never limits — GPUCheck-style pairing data). These are caps: the CPU
 * applies its cap at every resolution; min() with the GPU fps decides.
 */
const CPU_AAA_1080P: Record<string, number> = {
  "amd-ryzen-7-7800x3d": 212,
  "amd-ryzen-9-7950x": 186,
  "amd-ryzen-7-7700x": 181,
  "amd-ryzen-5-7600x": 163,
  "intel-core-i9-14900k": 206,
  "intel-core-i7-14700k": 199,
  "intel-core-i5-14600k": 172,
  "intel-core-i5-12400f": 131,
};

const CPU_ESPORTS_1080P: Record<string, number> = {
  "amd-ryzen-7-7800x3d": 905,
  "amd-ryzen-9-7950x": 712,
  "amd-ryzen-7-7700x": 668,
  "amd-ryzen-5-7600x": 585,
  "intel-core-i9-14900k": 808,
  "intel-core-i7-14700k": 781,
  "intel-core-i5-14600k": 631,
  "intel-core-i5-12400f": 452,
};

const RESOLUTIONS = ["1080p", "1440p", "4K"] as const;

const ROWS: Row[] = [];
for (const [slug, perRes] of Object.entries(GPU_AAA)) {
  for (const resolution of RESOLUTIONS) {
    ROWS.push({ slug, kind: "gpu", scenario: "aaa", resolution, avgFps: perRes[resolution], source: SOURCE_TPU });
  }
}
for (const [slug, perRes] of Object.entries(GPU_ESPORTS)) {
  for (const resolution of RESOLUTIONS) {
    ROWS.push({ slug, kind: "gpu", scenario: "esports", resolution, avgFps: perRes[resolution], source: SOURCE_TPU });
  }
}
for (const [slug, fps] of Object.entries(CPU_AAA_1080P)) {
  ROWS.push({ slug, kind: "cpu", scenario: "aaa", resolution: null, avgFps: fps, source: SOURCE_GPUCHECK });
}
for (const [slug, fps] of Object.entries(CPU_ESPORTS_1080P)) {
  ROWS.push({ slug, kind: "cpu", scenario: "esports", resolution: null, avgFps: fps, source: SOURCE_GPUCHECK });
}

async function main() {
  await db.delete(benchmarkData);
  await db.insert(benchmarkData).values(ROWS);
  console.log(`Seeded ${ROWS.length} benchmark rows.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
