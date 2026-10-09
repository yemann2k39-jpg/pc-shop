/**
 * Compatibility engine.
 *
 * Pure functions only — no DB access — so the same rules run on the server
 * and live in the browser (builder page computes findings on every change).
 *
 * Rule representation: one clearly-scoped check per rule family. Each check
 * returns findings tagged with its stable `rule` id; adding a rule = adding
 * an entry to `runChecks`. Severity semantics:
 *   error   — the build will not work as selected
 *   warning — works, but with a caveat (tight headroom, missing part…)
 *   info    — neutral context (incomplete build, iGPU in use)
 */

import type { Product } from "@/db/schema";
import { CATEGORIES } from "@/lib/catalog";

export type Severity = "error" | "warning" | "info";

export type CompatFinding = {
  /** Stable rule identifier, e.g. "cpuSocket". */
  rule: string;
  severity: Severity;
  /** Category slugs the finding relates to (empty for build-level notes). */
  parts: string[];
  message: string;
};

/** Selected parts for a build, keyed by category slug. */
export type BuildSelection = Partial<Record<string, Product>>;

/** Base system draw (motherboard, RAM, storage, fans) in watts. */
const BASE_DRAW_W = 60;
/** Recommended PSU headroom over measured draw. */
const HEADROOM_FACTOR = 1.25;

function specString(product: Product, key: string): string | undefined {
  const value = product.specs[key];
  return typeof value === "string" ? value : undefined;
}

function specNumber(product: Product, key: string): number | undefined {
  const value = product.specs[key];
  return typeof value === "number" ? value : undefined;
}

function specStringArray(product: Product, key: string): string[] {
  const value = product.specs[key];
  return Array.isArray(value) ? value : [];
}

/** Rough system power draw in watts; undefined until a CPU or GPU is picked. */
export function estimateSystemDraw(selection: BuildSelection): number | undefined {
  if (!selection.cpu && !selection.gpu) return undefined;
  const cpuW = selection.cpu ? (specNumber(selection.cpu, "tdpW") ?? 0) : 0;
  const gpuW = selection.gpu ? (specNumber(selection.gpu, "tdpW") ?? 0) : 0;
  return BASE_DRAW_W + cpuW + gpuW;
}

type FindingDraft = Omit<CompatFinding, "rule">;

type Check = { rule: string; run: (selection: BuildSelection) => FindingDraft[] };

const checkCompleteness: Check = {
  rule: "completeness",
  run: (sel) => {
    const filled = Object.values(sel).filter(Boolean).length;
    if (filled >= CATEGORIES.length) return [];
    return [
      {
        severity: "info",
        parts: [],
        message: `Build incomplete — ${filled} of ${CATEGORIES.length} parts selected.`,
      },
    ];
  },
};

const checkCpuSocket: Check = {
  rule: "cpuSocket",
  run: (sel) => {
    const cpu = sel.cpu;
    const motherboard = sel.motherboard;
    if (!cpu || !motherboard) return [];
    const cpuSocket = specString(cpu, "socket");
    const boardSocket = specString(motherboard, "socket");
    if (!cpuSocket || !boardSocket || cpuSocket === boardSocket) return [];
    return [
      {
        severity: "error",
        parts: ["cpu", "motherboard"],
        message: `CPU socket mismatch: ${cpu.brand} ${cpu.model} uses ${cpuSocket}, but the motherboard has an ${boardSocket} socket.`,
      },
    ];
  },
};

const checkRamType: Check = {
  rule: "ramType",
  run: (sel) => {
    const ram = sel.ram;
    const motherboard = sel.motherboard;
    if (!ram || !motherboard) return [];
    const ramType = specString(ram, "memoryType");
    const boardType = specString(motherboard, "memoryType");
    if (!ramType || !boardType || ramType === boardType) return [];
    return [
      {
        severity: "error",
        parts: ["ram", "motherboard"],
        message: `Memory type mismatch: ${ram.brand} ${ram.model} is ${ramType}, but the motherboard only supports ${boardType}.`,
      },
    ];
  },
};

const checkFormFactor: Check = {
  rule: "formFactor",
  run: (sel) => {
    const motherboard = sel.motherboard;
    const pcCase = sel.case;
    if (!motherboard || !pcCase) return [];
    const formFactor = specString(motherboard, "formFactor");
    const supported = specStringArray(pcCase, "formFactorSupport");
    if (!formFactor || supported.length === 0) return [];
    if (supported.includes(formFactor)) return [];
    return [
      {
        severity: "error",
        parts: ["motherboard", "case"],
        message: `Motherboard form factor ${formFactor} does not fit the case (supports ${supported.join(", ")}).`,
      },
    ];
  },
};

const checkGpuLength: Check = {
  rule: "gpuLength",
  run: (sel) => {
    const gpu = sel.gpu;
    const pcCase = sel.case;
    if (!gpu || !pcCase) return [];
    const length = specNumber(gpu, "lengthMm");
    const max = specNumber(pcCase, "maxGpuLengthMm");
    if (length === undefined || max === undefined || length <= max) return [];
    return [
      {
        severity: "error",
        parts: ["gpu", "case"],
        message: `GPU is ${length}mm long, but the case only fits cards up to ${max}mm.`,
      },
    ];
  },
};

const checkCoolerSocket: Check = {
  rule: "coolerSocket",
  run: (sel) => {
    const cooler = sel.cooler;
    const cpu = sel.cpu;
    if (!cooler || !cpu) return [];
    const supported = specStringArray(cooler, "supportedSockets");
    const cpuSocket = specString(cpu, "socket");
    if (supported.length === 0 || !cpuSocket) return [];
    if (supported.includes(cpuSocket)) return [];
    return [
      {
        severity: "error",
        parts: ["cooler", "cpu"],
        message: `Cooler does not support the ${cpuSocket} socket (supports ${supported.join(", ")}).`,
      },
    ];
  },
};

const checkCoolerHeight: Check = {
  rule: "coolerHeight",
  run: (sel) => {
    const cooler = sel.cooler;
    const pcCase = sel.case;
    if (!cooler || !pcCase) return [];
    // Air coolers have a height; AIO radiator fitment is not covered by
    // current case data and is therefore not checked.
    if (specString(cooler, "coolerType") !== "Air") return [];
    const height = specNumber(cooler, "heightMm");
    const max = specNumber(pcCase, "maxCoolerHeightMm");
    if (height === undefined || max === undefined || height <= max) return [];
    return [
      {
        severity: "error",
        parts: ["cooler", "case"],
        message: `Cooler is ${height}mm tall, but the case only fits coolers up to ${max}mm.`,
      },
    ];
  },
};

const checkDisplayOutput: Check = {
  rule: "displayOutput",
  run: (sel) => {
    const cpu = sel.cpu;
    const gpu = sel.gpu;
    if (!cpu || gpu) return [];
    const igpu = cpu.specs.integratedGraphics;
    if (igpu === false) {
      return [
        {
          severity: "warning",
          parts: ["cpu", "gpu"],
          message: `${cpu.brand} ${cpu.model} has no integrated graphics and no GPU is selected — the system cannot output video.`,
        },
      ];
    }
    if (igpu === true) {
      return [
        {
          severity: "info",
          parts: ["cpu"],
          message: `No discrete GPU selected — the CPU's integrated graphics will be used.`,
        },
      ];
    }
    return [
      {
        severity: "warning",
        parts: ["cpu", "gpu"],
        message: `Graphics support of ${cpu.brand} ${cpu.model} is unknown and no GPU is selected — verify the CPU has integrated graphics.`,
      },
    ];
  },
};

const checkPsuWattage: Check = {
  rule: "psuWattage",
  run: (sel) => {
    const psu = sel.psu;
    const draw = estimateSystemDraw(sel);
    if (!psu || draw === undefined) return [];
    const wattage = specNumber(psu, "wattageW");
    if (wattage === undefined) return [];
    if (wattage < draw) {
      return [
        {
          severity: "error",
          parts: ["psu"],
          message: `PSU is underpowered: the system draws ~${draw}W but this PSU provides ${wattage}W.`,
        },
      ];
    }
    if (wattage < draw * HEADROOM_FACTOR) {
      return [
        {
          severity: "warning",
          parts: ["psu"],
          message: `Tight PSU headroom: ~${draw}W draw vs ${wattage}W — 20–30% headroom is recommended.`,
        },
      ];
    }
    return [];
  },
};

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

const runChecks: Check[] = [
  checkCompleteness,
  checkCpuSocket,
  checkRamType,
  checkFormFactor,
  checkGpuLength,
  checkCoolerSocket,
  checkCoolerHeight,
  checkDisplayOutput,
  checkPsuWattage,
];

/**
 * Runs every compatibility check over the selected parts and returns the
 * findings sorted by severity (errors first).
 */
export function checkCompatibility(selection: BuildSelection): CompatFinding[] {
  const findings = runChecks.flatMap(({ rule, run }) =>
    run(selection).map((draft) => ({ ...draft, rule })),
  );
  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
