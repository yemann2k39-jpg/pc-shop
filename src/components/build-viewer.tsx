"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Group, MeshStandardMaterial } from "three";
import { BoxGeometry, EdgesGeometry } from "three";
import * as THREE from "three";

import {
  CASE_DIMENSIONS,
  MODEL_OVERRIDES,
  SLOT_LAYOUT,
  type SlotAnchor,
} from "@/lib/build-scene";

export type BuildViewerHandle = {
  resetCamera: () => void;
  toggleAutoRotate: () => void;
};

export type BuildViewerProps = {
  /** Category slug -> selected product (drives which models render). */
  selection: Record<string, unknown>;
  /** Category accent color per slug (from the catalog config). */
  accents: Record<string, string>;
  /** Categories with error findings — their parts render tinted red. */
  errorCategories: Set<string>;
  /** Fired when a part or ghost slot is clicked in the 3D view. */
  onPartClick: (category: string) => void;
  /** Number of RAM sticks to render (1–4). */
  ramSticks?: number;
  /** Chosen SSD product (renders in the on-board M.2 slot). */
  ssdDrive?: unknown;
  /** Chosen HDD product (renders in the flat mount below). */
  hddDrive?: unknown;
};

const GLASS = "#9fb6d4";
const ERROR_COLOR = "#dc2626";

/* ------------------------------------------------------------------ */
/* Shared materials (palette)                                          */
/* ------------------------------------------------------------------ */

const C = {
  caseDark: "#1b1b1f",
  casePanel: "#232328",
  metal: "#b7bcc4",
  metalDark: "#3f3f46",
  plastic: "#26262b",
  pcb: "#166534",
  pcbDark: "#134e2f",
  gold: "#d4af37",
  black: "#141417",
  white: "#e5e7eb",
};

/* ------------------------------------------------------------------ */
/* Error tint pulse                                                    */
/* ------------------------------------------------------------------ */

function useErrorPulse(group: React.RefObject<Group | null>, hasError: boolean) {
  useFrame((state) => {
    if (!hasError || !group.current) return;
    const intensity = 0.35 + 0.3 * Math.sin(state.clock.elapsedTime * 5);
    group.current.traverse((object) => {
      const material = (object as { material?: MeshStandardMaterial }).material;
      if (material && "emissive" in material) {
        material.emissive.set(ERROR_COLOR);
        material.emissiveIntensity = intensity;
      }
    });
  });
  useEffect(() => {
    if (hasError || !group.current) return;
    group.current.traverse((object) => {
      const material = (object as { material?: MeshStandardMaterial }).material;
      if (material && "emissive" in material) {
        material.emissive.set("#000000");
        material.emissiveIntensity = 1;
      }
    });
  }, [hasError, group]);
}

/* ------------------------------------------------------------------ */
/* Fan (spinning) — reused by case front, GPU, cooler                  */
/* ------------------------------------------------------------------ */

function Fan({
  radius,
  spinning = true,
  speed = 1.4,
  frame = true,
}: {
  radius: number;
  spinning?: boolean;
  speed?: number;
  frame?: boolean;
}) {
  const blades = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spinning && blades.current) blades.current.rotation.z -= delta * speed;
  });
  const bladeCount = 7;
  return (
    <group>
      {frame ? (
        <RoundedBox
          args={[radius * 2.15, radius * 2.15, radius * 0.45]}
          radius={radius * 0.18}
          smoothness={3}
        >
          <meshStandardMaterial color={C.plastic} roughness={0.55} />
        </RoundedBox>
      ) : null}
      <group>
        <mesh>
          <torusGeometry args={[radius * 0.96, radius * 0.07, 8, 32]} />
          <meshStandardMaterial color={C.metalDark} roughness={0.5} />
        </mesh>
        <group ref={blades}>
          {Array.from({ length: bladeCount }).map((_, i) => (
            <group key={i} rotation={[0, 0, (i / bladeCount) * Math.PI * 2]}>
              <mesh position={[radius * 0.55, 0, 0]} rotation={[0.5, 0, 0.35]}>
                <boxGeometry args={[radius * 0.62, radius * 0.5, radius * 0.06]} />
                <meshStandardMaterial color="#3a3a41" roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
        <mesh>
          <cylinderGeometry args={[radius * 0.3, radius * 0.3, radius * 0.3, 20]} />
          <meshStandardMaterial color={C.black} roughness={0.45} />
        </mesh>
      </group>
    </group>
  );
}

/** Vertical stack of thin cooling fins. */
function FinStack({
  width,
  height,
  depth,
  count = 10,
}: {
  width: number;
  height: number;
  depth: number;
  count?: number;
}) {
  const step = depth / count;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[0, 0, -depth / 2 + step / 2 + i * step]}>
          <boxGeometry args={[width, height, step * 0.45]} />
          <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Case                                                                */
/* ------------------------------------------------------------------ */

function CaseModel() {
  const { width, height, depth } = CASE_DIMENSIONS;
  const t = 1.2; // panel thickness
  const half = { x: width / 2, y: height / 2, z: depth / 2 };

  return (
    <group>
      {/* slim corner frame pillars (reference is a hard-edged box) */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <RoundedBox
            key={`pillar-${sx}-${sz}`}
            args={[1.6, height - 2, 1.6]}
            radius={0.15}
            smoothness={2}
            position={[sx * (half.x - 0.8), 0, sz * (half.z - 0.8)]}
          >
            <meshStandardMaterial color={C.caseDark} roughness={0.45} />
          </RoundedBox>
        )),
      )}
      {/* top + bottom rails connecting the pillars */}
      <RoundedBox args={[width, 1.6, depth]} radius={0.12} smoothness={2} position={[0, half.y - 0.8, 0]}>
        <meshStandardMaterial color={C.caseDark} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[width, 1.6, depth]} radius={0.12} smoothness={2} position={[0, -half.y + 0.8, 0]}>
        <meshStandardMaterial color={C.caseDark} roughness={0.45} />
      </RoundedBox>
      {/* floor + roof panels */}
      <Panel position={[0, -half.y + t, 0]} size={[width - 3, t, depth - 3]} color={C.casePanel} />
      {/* roof with ventilation slats */}
      <Panel position={[0, half.y - t, 0]} size={[width - 3, t, depth - 3]} color={C.casePanel} />
      {[-3, -1, 1, 3].map((i) => (
        <mesh key={`vent-${i}`} position={[(i * width) / 9, half.y - t / 2, 0]}>
          <boxGeometry args={[1.1, t + 0.4, depth * 0.6]} />
          <meshStandardMaterial color={C.caseDark} roughness={0.6} />
        </mesh>
      ))}
      {/* front glass (back panel is the segmented fan panel below) */}
      <Panel position={[0, 0, half.z - t]} size={[width - 3, height - 3, t]} glass />
      {/* left solid, right glass */}
      <Panel position={[-half.x + t, 0, 0]} size={[t, height - 3, depth - 3]} color={C.caseDark} />
      <Panel position={[half.x - t, 0, 0]} size={[t, height - 3, depth - 3]} glass />
      {/* back panel with three real cutouts — frame segments around the
          fan holes, then hole tubes and fans seated mid-thickness so the
          fans are visible from outside the case */}
      {(() => {
        const pw = width - 3;
        const ph = height - 3;
        const pz = -half.z + t / 2;
        const r = 8.6;
        const holes = [-18, 0, 18];
        const colW = (pw - r * 2) / 2;
        const colCx = r / 2 + colW / 2;
        const strips: [number, number][] = [
          [-ph / 2, holes[0] - r],
          [holes[0] + r, holes[1] - r],
          [holes[1] + r, holes[2] - r],
          [holes[2] + r, ph / 2],
        ];
        return (
          <group>
            {/* side columns */}
            {[-colCx, colCx].map((x) => (
              <mesh key={x} position={[x, 0, pz]}>
                <boxGeometry args={[colW, ph, t]} />
                <meshStandardMaterial color={C.caseDark} roughness={0.5} />
              </mesh>
            ))}
            {/* horizontal strips between/beside the holes */}
            {strips.map(([y0, y1]) =>
              y1 - y0 > 0.2 ? (
                <mesh key={y0} position={[0, (y0 + y1) / 2, pz]}>
                  <boxGeometry args={[r * 2, y1 - y0, t]} />
                  <meshStandardMaterial color={C.caseDark} roughness={0.5} />
                </mesh>
              ) : null,
            )}
            {/* hole tubes + fans */}
            {holes.map((y) => (
              <group key={`exhaust-${y}`}>
                <mesh position={[0, y, pz]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[r, r, t + 0.4, 32, 1, true]} />
                  <meshStandardMaterial
                    color={C.black}
                    roughness={0.8}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <group position={[0, y, pz]}>
                  <Fan radius={7} speed={1.4} frame={false} />
                  <mesh>
                    <torusGeometry args={[8.3, 0.5, 8, 32]} />
                    <meshStandardMaterial color={C.caseDark} roughness={0.5} />
                  </mesh>
                </group>
              </group>
            ))}
          </group>
        );
      })()}
      {/* top-front I/O: power button + USB ports */}
      <mesh position={[width / 2 - 5, half.y - 1.6, half.z - 5]}>
        <cylinderGeometry args={[1, 1, 0.5, 20]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.35} />
      </mesh>
      <mesh position={[width / 2 - 10.5, half.y - 1.6, half.z - 4.2]}>
        <boxGeometry args={[3.4, 0.9, 1]} />
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </mesh>
      {/* motherboard tray */}
      <mesh position={[-half.x + t + 0.4, 0, -6]}>
        <boxGeometry args={[0.6, height - 12, depth - 16]} />
        <meshStandardMaterial color={C.casePanel} roughness={0.6} />
      </mesh>
      {/* feet */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`foot-${sx}-${sz}`}
            position={[sx * (half.x - 4), -half.y - 0.7, sz * (half.z - 5)]}
          >
            <cylinderGeometry args={[2.2, 2.6, 1.4, 16]} />
            <meshStandardMaterial color={C.black} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Small helper so front fans sit just behind the front glass. */
function radiusOffset(width: number) {
  return 1.2 + width * 0.02;
}

/** Transparent placeholder volume shown until the user picks a case. */
function CaseFoundation() {
  const { width, height, depth } = CASE_DIMENSIONS;
  return (
    <group>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#9aa1ad"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="#6b7280" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

function Panel({
  position,
  size,
  color = "#e4e4e7",
  glass = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  glass?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {glass ? (
        <meshPhysicalMaterial
          color="#a8c0dd"
          transparent
          opacity={0.22}
          roughness={0.08}
          metalness={0}
        />
      ) : (
        <meshStandardMaterial color={color} roughness={0.5} />
      )}
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Part models                                                         */
/* ------------------------------------------------------------------ */

/**
 * Renders a sourced GLB for the category when present (TCK-23 round 2).
 * Falls back to the code-primitive model while loading, on 404, or when
 * MODEL_OVERRIDES[category].file is null — so the viewer never breaks.
 */
function GltfPartModel({
  category,
  anchor,
  fallback,
}: {
  category: string;
  anchor: SlotAnchor;
  fallback: React.ReactNode;
}) {
  const override = MODEL_OVERRIDES[category];
  const [gltfScene, setGltfScene] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!override?.file) return;
    let alive = true;
    setGltfScene(null);
    setFailed(false);
    const loader = new GLTFLoader();
    loader.load(
      `/models/${override.file}`,
      (gltf) => {
        if (alive) setGltfScene(gltf.scene);
      },
      undefined,
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [override?.file]);

  if (!override?.file || failed || !gltfScene) return <>{fallback}</>;

  const [sx, sy, sz] = anchor.size;
  const box = new THREE.Box3().setFromObject(gltfScene);
  const dims = box.getSize(new THREE.Vector3());
  const longest = Math.max(dims.x, dims.y, dims.z) || 1;
  // Fit the model into its slot footprint using the largest footprint axis,
  // then apply the per-model fine-tune scale.
  const fit = Math.max(sx, sy, sz) / longest;
  const [rx, ry, rz] = (override.rotation ?? [0, 0, 0]).map(
    (deg) => (deg * Math.PI) / 180,
  );
  const [ox, oy, oz] = override.offset ?? [0, 0, 0];

  return (
    <group
      rotation={[rx, ry, rz]}
      position={[ox, oy, oz]}
      scale={(override.scale ?? 1) * fit}
    >
      <primitive object={gltfScene} />
    </group>
  );
}

function MotherboardModel({ anchor }: { anchor: SlotAnchor }) {
  // Board plane is height (y) x depth (z), facing +x toward the glass.
  // Modern ATX layout: socket upper-back, 4 DIMMs beside it, single
  // reinforced PCIe slot below, chipset heatsink at the bottom-back,
  // IO shroud along the back edge, 24-pin at the front edge.
  const [by, bz] = [anchor.size[1], anchor.size[2]];
  return (
    <group>
      {/* light graphite PCB — reads against the black case interior */}
      <mesh>
        <boxGeometry args={[anchor.size[0], by, bz]} />
        <meshStandardMaterial color="#b6bcc6" roughness={0.6} />
      </mesh>
      {/* IO shroud along the back edge */}
      <mesh position={[1.2, by * 0.32, -bz / 2 + 3]}>
        <boxGeometry args={[2.4, by * 0.34, 6]} />
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </mesh>
      {/* CPU socket (aligns with the cpu slot anchor: local y+8, z-8) */}
      <mesh position={[0.9, 8, -8]}>
        <boxGeometry args={[0.8, 8, 8]} />
        <meshStandardMaterial color={C.caseDark} roughness={0.4} />
      </mesh>
      <mesh position={[1.35, 8, -8]}>
        <boxGeometry args={[0.3, 6, 6]} />
        <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* 4 DIMM slots (align with ram sticks: local center y+8, z+6) */}
      {[-4.05, -1.35, 1.35, 4.05].map((dz) => (
        <mesh key={dz} position={[0.8, 8, 6 + dz]}>
          <boxGeometry args={[1, 13, 0.7]} />
          <meshStandardMaterial color={C.black} roughness={0.5} />
        </mesh>
      ))}
      {/* single reinforced PCIe slot (gpu anchor: local y-6, z 0) */}
      <mesh position={[0.8, -6, 0]}>
        <boxGeometry args={[1.1, 1.4, 16]} />
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </mesh>
      <mesh position={[0.8, -6.8, 0]}>
        <boxGeometry args={[0.9, 0.5, 16]} />
        <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* chipset heatsink, bottom-back */}
      <mesh position={[0.9, -14, -6]}>
        <boxGeometry args={[0.9, 5, 5]} />
        <meshStandardMaterial color={C.metalDark} metalness={0.6} roughness={0.45} />
      </mesh>
      {/* 8-pin EPS power, back edge above the socket */}
      <mesh position={[0.8, 16, -14]}>
        <boxGeometry args={[1.2, 2.6, 4]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
      {/* two PCIe x1 slots below the main slot */}
      {[-6, 2].map((z) => (
        <mesh key={z} position={[0.8, -11, z]}>
          <boxGeometry args={[0.9, 0.9, 6]} />
          <meshStandardMaterial color={C.caseDark} roughness={0.5} />
        </mesh>
      ))}
      {/* SATA port block, front-bottom edge */}
      <mesh position={[0.8, -19.5, 10]}>
        <boxGeometry args={[0.9, 1.4, 4.5]} />
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </mesh>
      {/* M.2 heatsink shield under the SSD anchor (moved with the SSD,
          forward of the GPU: local y-8, z 18) */}
      <mesh position={[0.7, -8, 18]}>
        <boxGeometry args={[0.6, 8.6, 3]} />
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </mesh>
      <mesh position={[1.05, -8, 18]}>
        <boxGeometry args={[0.25, 8.6, 0.5]} />
        <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* 24-pin power connector, front edge beside the DIMMs */}
      <mesh position={[0.8, 12, 18]}>
        <boxGeometry args={[1.4, 5, 2]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
    </group>
  );
}

function CpuModel() {
  // Die sits on the vertical board, contact face toward +x.
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.9, 6.4, 6.4]} />
        <meshStandardMaterial color={C.pcb} roughness={0.6} />
      </mesh>
      <mesh position={[0.55, 0, 0]}>
        <boxGeometry args={[0.5, 5, 5]} />
        <meshStandardMaterial color={C.metal} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, -2.9, 2.9]}>
        <boxGeometry args={[0.7, 0.5, 0.5]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function CoolerModel({ spinning }: { spinning: boolean }) {
  // Tower cooler mounted on the vertical board: airflow along +x.
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <group position={[0, 1, 0]}>
        <FinStack width={11} height={11} depth={9} count={12} />
      </group>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, -6, 2.2]}>
          <cylinderGeometry args={[0.55, 0.55, 5, 12]} />
          <meshStandardMaterial color={C.metal} metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, -8.6, 1]}>
        <boxGeometry args={[10.5, 1, 6]} />
        <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.3} />
      </mesh>
      <group position={[0, 1, 5.2]}>
        <Fan radius={4.6} spinning={spinning} speed={2} />
      </group>
    </group>
  );
}

function RamModel({ count = 2 }: { count?: number }) {
  // DIMMs on the vertical board, sticks protruding toward +x. Slots are
  // numbered 1-4 by distance from the CPU (4 = nearest). Populate from
  // slot 4 first: 1 stick -> [4], 2 -> [2,4], 3 -> [2,3,4], 4 -> all.
  const slotOffsets: Record<number, number> = { 1: 4.05, 2: 1.35, 3: -1.35, 4: -4.05 };
  const sets: Record<number, number[]> = {
    1: [4],
    2: [2, 4],
    3: [2, 3, 4],
    4: [1, 2, 3, 4],
  };
  const slots = sets[Math.min(4, Math.max(1, count))];
  return (
    <group>
      {slots.map((slot) => (
        <group key={slot} position={[0, 0, slotOffsets[slot]]}>
          <mesh>
            <boxGeometry args={[4.4, 13, 1.1]} />
            <meshStandardMaterial color={C.black} roughness={0.5} />
          </mesh>
          <mesh position={[2.1, 6.4, 0]}>
            <boxGeometry args={[0.6, 1.6, 1.5]} />
            <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GpuModel({ anchor, accent }: { anchor: SlotAnchor; accent: string }) {
  // Black triple-fan card. Card hangs off the PCIe slot: length along z,
  // width along x (out from the board), fans facing DOWN (-y), gold
  // fingers on the board-facing edge.
  const [sx, sy, sz] = anchor.size;
  return (
    <group>
      {/* black shroud */}
      <RoundedBox args={[sx, sy, sz]} radius={0.5} smoothness={3}>
        <meshStandardMaterial color={C.caseDark} roughness={0.45} />
      </RoundedBox>
      {/* dark mid-frame strip along the front edge */}
      <mesh position={[0, 0, sz / 2 + 0.12]}>
        <boxGeometry args={[sx * 0.96, sy * 0.42, 0.25]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
      {/* gunmetal backplate */}
      <mesh position={[0, sy / 2 + 0.25, 0]}>
        <boxGeometry args={[sx * 0.96, 0.5, sz * 0.94]} />
        <meshStandardMaterial color={C.metalDark} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* three fans on the bottom face (axis -y), spread along the card length */}
      {[-sz * 0.3, 0, sz * 0.3].map((z) => (
        <group key={z} position={[0, -sy / 2 - 0.35, z]} rotation={[Math.PI / 2, 0, 0]}>
          <Fan radius={sy * 0.5} spinning speed={1.7} frame={false} />
          <mesh>
            <torusGeometry args={[sy * 0.55, 0.28, 8, 32]} />
            <meshStandardMaterial color={C.metalDark} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {/* gold PCIe fingers on the board-facing edge */}
      <mesh position={[-sx / 2 + 0.35, -0.4, 2]}>
        <boxGeometry args={[0.7, 0.8, sz * 0.3]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
      {/* 8-pin power connector on top edge */}
      <mesh position={[0, sy / 2 + 0.7, -sz * 0.3]}>
        <boxGeometry args={[4.5, 1.4, 2.6]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
      {/* subtle category-accent strip on the top edge */}
      <mesh position={[sx * 0.1, sy / 2 + 0.35, sz * 0.22]}>
        <boxGeometry args={[sx * 0.5, 0.3, 0.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
      </mesh>
    </group>
  );
}

function PsuModel({ anchor, hasError }: { anchor: SlotAnchor; hasError: boolean }) {
  const [sx, sy, sz] = anchor.size;
  // ATX PSU: fan intake on the top face (+y), IEC socket + rocker on the
  // rear face (-z), modular cable sockets on the front face (+z), spec
  // label on the glass-facing side (+x). All parts centered per face.
  return (
    <group>
      {/* matte black chassis */}
      <RoundedBox args={[sx, sy, sz]} radius={0.5} smoothness={3}>
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </RoundedBox>

      {/* top intake fan, recessed in a dark well (cylinder axis stays y) */}
      <mesh position={[0, sy / 2 - 0.18, 0]}>
        <cylinderGeometry args={[sy * 0.52, sy * 0.52, 0.5, 32]} />
        <meshStandardMaterial color={C.black} roughness={0.65} />
      </mesh>
      <group position={[0, sy / 2 - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <Fan radius={sy * 0.42} spinning speed={1.1} frame={false} />
        <mesh>
          <torusGeometry args={[sy * 0.52, 0.25, 8, 32]} />
          <meshStandardMaterial color={C.metalDark} roughness={0.5} />
        </mesh>
      </group>

      {/* rear face (-z): IEC C14 socket + rocker switch, side by side */}
      <mesh position={[-sx * 0.22, 0, -sz / 2 - 0.25]}>
        <boxGeometry args={[3.2, 2.6, 0.6]} />
        <meshStandardMaterial color={C.black} roughness={0.6} />
      </mesh>
      <mesh position={[sx * 0.2, 0, -sz / 2 - 0.2]}>
        <boxGeometry args={[1.5, 1.9, 0.5]} />
        <meshStandardMaterial color={hasError ? "#7f1d1d" : C.metalDark} metalness={0.6} roughness={0.45} />
      </mesh>

      {/* front face (+z): modular cable sockets, 2 rows x 3 */}
      {[-1, 0, 1].map((col) =>
        [-1, 1].map((row) => (
          <mesh
            key={`${col}-${row}`}
            position={[col * (sx * 0.22), row * (sy * 0.2), sz / 2 + 0.15]}
          >
            <boxGeometry args={[2.2, 1.4, 0.35]} />
            <meshStandardMaterial color={hasError ? "#7f1d1d" : C.plastic} roughness={0.5} />
          </mesh>
        )),
      )}

      {/* spec label on the glass-facing side (+x) with gold stripe */}
      <mesh position={[sx / 2 + 0.12, 0, 0]}>
        <boxGeometry args={[0.2, sy * 0.6, sz * 0.6]} />
        <meshStandardMaterial color="#c8ccd2" roughness={0.65} />
      </mesh>
      <mesh position={[sx / 2 + 0.24, 0, sz * 0.12]}>
        <boxGeometry args={[0.15, sy * 0.6, sz * 0.14]} />
        <meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

function SsdModel() {
  // SSD per the downloaded reference: black body with a gold top cover.
  return (
    <group>
      {/* black casing */}
      <mesh>
        <boxGeometry args={[0.7, 8, 2.4]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
      {/* gold cover plate */}
      <mesh position={[0.35, 0, 0]}>
        <boxGeometry args={[0.3, 7.2, 2]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
      {/* gold connector edge */}
      <mesh position={[0.2, -3.95, 0]}>
        <boxGeometry args={[0.4, 0.5, 1.6]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function HddModel({ accent }: { accent: string }) {
  // 2.5" class drive in a flat mount, below the SSD slot.
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.6, 10, 7]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.5} />
      </mesh>
      <mesh position={[0.85, 0, 0]}>
        <boxGeometry args={[0.2, 6, 4.6]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      {/* SATA connector edge */}
      <mesh position={[0, -5.2, -1.8]}>
        <boxGeometry args={[1, 0.6, 1.4]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Part wrapper: anchor + error tint + hover + click                   */
/* ------------------------------------------------------------------ */

function PartModel({
  category,
  anchor,
  accent,
  hasError,
  onClick,
  ramSticks = 2,
}: {
  category: string;
  anchor: SlotAnchor;
  accent: string;
  hasError: boolean;
  onClick: () => void;
  ramSticks?: number;
}) {
  const group = useRef<Group>(null);
  useErrorPulse(group, hasError);
  const [hovered, setHovered] = useState(false);
  useEffect(() => () => {
    document.body.style.cursor = "default";
  }, []);

  const primitive = (() => {
    switch (category) {
      case "motherboard":
        return <MotherboardModel anchor={anchor} />;
      case "cpu":
        return <CpuModel />;
      case "cooler":
        return <CoolerModel spinning />;
      case "ram":
        return <RamModel count={ramSticks} />;
      case "gpu":
        return <GpuModel anchor={anchor} accent={accent} />;
      case "psu":
        return <PsuModel anchor={anchor} hasError={hasError} />;
      case "ssd":
        return <SsdModel />;
      case "hdd":
        return <HddModel accent={accent} />;
      default:
        return null;
    }
  })();

  const model =
    category === "case" ? (
      primitive
    ) : (
      <GltfPartModel category={category} anchor={anchor} fallback={primitive} />
    );

  return (
    <group
      ref={group}
      position={anchor.position}
      scale={hovered ? 1.04 : 1}
      onClick={(event) => {
        if (event.delta > 4) return;
        event.stopPropagation();
        onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {model}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ghost slots                                                         */
/* ------------------------------------------------------------------ */

function GhostSlot({ anchor }: { anchor: SlotAnchor }) {
  const ghostGeometry = useMemo(
    () => new EdgesGeometry(new BoxGeometry(...anchor.size)),
    [anchor],
  );
  useEffect(() => () => ghostGeometry.dispose(), [ghostGeometry]);
  return (
    <group position={anchor.position}>
      <mesh>
        <boxGeometry args={anchor.size} />
        <meshStandardMaterial color="#d4d4d8" transparent opacity={0.08} />
      </mesh>
      <lineSegments geometry={ghostGeometry}>
        <lineBasicMaterial color="#a1a1aa" />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene root                                                          */
/* ------------------------------------------------------------------ */

function Scene({
  selection,
  accents,
  errorCategories,
  onPartClick,
  autoRotate,
  ramSticks = 2,
  ssdDrive,
  hddDrive,
}: {
  selection: Record<string, unknown>;
  accents: Record<string, string>;
  errorCategories: Set<string>;
  onPartClick: (category: string) => void;
  autoRotate: boolean;
  ramSticks?: number;
  ssdDrive?: unknown;
  hddDrive?: unknown;
}) {
  // Drives render at their own dedicated anchors (ssd/hdd in SLOT_LAYOUT).
  const drives = [
    { type: "ssd" as const, product: ssdDrive },
    { type: "hdd" as const, product: hddDrive },
  ].filter((d) => Boolean(d.product));
  const showSsd = drives.some((d) => d.type === "ssd");
  const showHdd = drives.some((d) => d.type === "hdd");

  const focusSlug = (slug: string) =>
    onPartClick(slug === "ssd" || slug === "hdd" ? "storage" : slug);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[45, 70, 55]} intensity={1.5} />
      <directionalLight position={[-40, 20, -45]} intensity={0.4} />
      <pointLight position={[0, 0, 45]} intensity={0.5} />
      {selection.case ? <CaseModel /> : <CaseFoundation />}
      {Object.entries(SLOT_LAYOUT)
        .filter(([slug]) => slug !== "case" && slug !== "ssd" && slug !== "hdd")
        .map(([slug, anchor]) =>
          selection[slug] ? null : (
            <group
              key={`ghost-${slug}`}
              onClick={(event) => {
                if (event.delta > 4) return;
                event.stopPropagation();
                focusSlug(slug);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "default";
              }}
            >
              <GhostSlot anchor={anchor} />
            </group>
          ),
        )}
      {/* drive ghosts: show whichever drive slot is still empty */}
      {[!showSsd && "ssd", !showHdd && "hdd"]
        .filter((slug): slug is string => Boolean(slug))
        .map((slug) => (
          <group
            key={`ghost-${slug}`}
            onClick={(event) => {
              if (event.delta > 4) return;
              event.stopPropagation();
              focusSlug(slug);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <GhostSlot anchor={SLOT_LAYOUT[slug]} />
          </group>
        ))}
      {Object.entries(SLOT_LAYOUT)
        .filter(([slug]) => slug !== "case" && slug !== "ssd" && slug !== "hdd" && selection[slug])
        .map(([slug, anchor]) => (
          <PartModel
            key={`part-${slug}`}
            category={slug}
            anchor={anchor}
            accent={accents[slug] ?? "#52525b"}
            hasError={errorCategories.has(slug)}
            ramSticks={ramSticks}
            onClick={() => focusSlug(slug)}
          />
        ))}
      {drives.map(({ type }) => (
        <PartModel
          key={`part-${type}`}
          category={type}
          anchor={SLOT_LAYOUT[type]}
          accent={accents.storage ?? "#52525b"}
          hasError={errorCategories.has("storage")}
          ramSticks={ramSticks}
          onClick={() => focusSlug(type)}
        />
      ))}
      <ContactShadows
        position={[0, -CASE_DIMENSIONS.height / 2 - 0.5, 0]}
        opacity={0.45}
        scale={140}
        blur={2.2}
        far={40}
      />
    </>
  );
}

const BuildViewer = forwardRef<BuildViewerHandle, BuildViewerProps>(
  function BuildViewer(
    { selection, accents, errorCategories, onPartClick, ramSticks, ssdDrive, hddDrive },
    ref,
  ) {
    const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
    const [autoRotate, setAutoRotate] = useState(false);

    useImperativeHandle(ref, () => ({
      resetCamera: () => controls.current?.reset(),
      toggleAutoRotate: () => setAutoRotate((value) => !value),
    }));

    return (
      <Canvas
        shadows
        camera={{ position: [88, 42, 108], fov: 40 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene
          selection={selection}
          accents={accents}
          errorCategories={errorCategories}
          onPartClick={onPartClick}
          autoRotate={autoRotate}
          ramSticks={ramSticks}
          ssdDrive={ssdDrive}
          hddDrive={hddDrive}
        />
        <OrbitControls
          ref={controls}
          target={[0, 0, 0]}
          enablePan={false}
          minDistance={55}
          maxDistance={170}
          autoRotate={autoRotate}
          autoRotateSpeed={0.9}
        />
      </Canvas>
    );
  },
);

export default BuildViewer;
