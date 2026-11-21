/**
 * 3D scene layout for the PC builder viewer.
 *
 * The case is modeled around an origin-centered box (x = width, y = height,
 * z = depth; y up). Parts are placed at fixed slot anchors on the back wall
 * and floor — a stylized "open bench" layout chosen for readability rather
 * than strict mechanical accuracy.
 *
 * Both ghost markers (empty slots) and part models derive their footprint
 * from these anchors, so adjusting a slot = editing one entry here.
 */

export type SlotAnchor = {
  /** Anchor center, in case coordinates. */
  position: [number, number, number];
  /** Footprint of the part/ghost box. */
  size: [number, number, number];
};

/** Outer case dimensions (width x, height y, depth z). */
export const CASE_DIMENSIONS = { width: 40, height: 78, depth: 66 } as const;

export const SLOT_LAYOUT: Record<string, SlotAnchor> = {
  // Motherboard mounts on the solid left wall, facing the right glass
  // (its plane is height x depth, normal along +x).
  motherboard: { position: [-18, 2, -4], size: [1.6, 42, 44] },
  cpu: { position: [-17, 10, -12], size: [1.2, 8, 8] },
  cooler: { position: [-10.5, 10, -12], size: [11, 11, 11] },
  ram: { position: [-15, 10, 2], size: [4.4, 14, 11.5] },
  gpu: { position: [-8, -4, -4], size: [16, 4.5, 28] },
  psu: { position: [-11.2, -31.8, -16], size: [15, 12, 28] },
  // Storage split: SSD (M.2, on the board) and HDD (flat mount below) have
  // their own anchors, placed forward of the GPU (which ends at z = 10)
  // so nothing overlaps.
  ssd: { position: [-16.5, -6, 14], size: [0.9, 8, 2.6] },
  hdd: { position: [-16.5, 5, 12], size: [2, 10, 7] },
  case: { position: [0, 0, 0], size: [CASE_DIMENSIONS.width, CASE_DIMENSIONS.height, CASE_DIMENSIONS.depth] },
};

/**
 * Sourced GLB model overrides (TCK-23 round 2). Each entry points at a
 * model in public/models/; when the file exists the viewer renders it
 * instead of the code-primitive part, normalized by the transform below.
 * Set an entry to null to keep the code-primitive for that category.
 *
 * Transform semantics: `scale` is a uniform multiplier applied before the
 * anchor footprint fit, `rotation` is degrees per axis, `offset` shifts the
 * model inside its slot anchor (case units). Tune per model after download.
 */
export type ModelOverride = {
  file: string | null;
  scale?: number;
  rotation?: [number, number, number];
  offset?: [number, number, number];
};

export const MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // Round-3 decision: the GLBs are REFERENCE ONLY — every part is remodeled
  // in code (build-viewer.tsx) so nothing branded/textured ships. The
  // override mechanism stays wired (set file: "x.glb") for direct use later.
  motherboard: { file: null },
  cpu: { file: null },
  cooler: { file: null },
  ram: { file: null },
  gpu: { file: null },
  psu: { file: null },
  storage: { file: null },
  case: { file: null },
};
