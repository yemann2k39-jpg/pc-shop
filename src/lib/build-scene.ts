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
export const CASE_DIMENSIONS = { width: 44, height: 84, depth: 58 } as const;

export const SLOT_LAYOUT: Record<string, SlotAnchor> = {
  motherboard: { position: [-4, 6, -25], size: [32, 30, 1.6] },
  cpu: { position: [-9, 14, -23], size: [7, 7, 1.2] },
  cooler: { position: [-9, 14, -20.5], size: [11, 11, 3.5] },
  ram: { position: [7, 13, -23.5], size: [12, 14, 1.4] },
  gpu: { position: [-3, -2, -16], size: [28, 4.5, 11] },
  psu: { position: [-10, -30, -12], size: [15, 8.5, 28] },
  storage: { position: [13, -20, -8], size: [8, 2, 14] },
  case: { position: [0, 0, 0], size: [CASE_DIMENSIONS.width, CASE_DIMENSIONS.height, CASE_DIMENSIONS.depth] },
};
