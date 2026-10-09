"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
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

import { CASE_DIMENSIONS, SLOT_LAYOUT, type SlotAnchor } from "@/lib/build-scene";

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
  const t = 1.4;
  const half = { x: width / 2, y: height / 2, z: depth / 2 };
  const frontFans = [-height * 0.18, height * 0.12];

  return (
    <group>
      {/* corner pillars */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <RoundedBox
            key={`pillar-${sx}-${sz}`}
            args={[2.4, height, 2.4]}
            radius={0.5}
            smoothness={3}
            position={[sx * (half.x - 1.2), 0, sz * (half.z - 1.2)]}
          >
            <meshStandardMaterial color={C.caseDark} roughness={0.5} />
          </RoundedBox>
        )),
      )}
      {/* bottom + top */}
      <RoundedBox
        args={[width, t, depth]}
        radius={0.4}
        smoothness={3}
        position={[0, -half.y, 0]}
      >
        <meshStandardMaterial color={C.caseDark} roughness={0.55} />
      </RoundedBox>
      <RoundedBox
        args={[width, t, depth]}
        radius={0.4}
        smoothness={3}
        position={[0, half.y, 0]}
      >
        <meshStandardMaterial color={C.casePanel} roughness={0.5} />
      </RoundedBox>
      {/* back solid, front glass */}
      <Panel position={[0, 0, -half.z]} size={[width, height, t]} color={C.caseDark} />
      <Panel position={[0, 0, half.z]} size={[width, height, t]} glass />
      {/* left solid, right glass */}
      <Panel position={[-half.x, 0, 0]} size={[t, height, depth]} color={C.caseDark} />
      <Panel position={[half.x, 0, 0]} size={[t, height, depth]} glass />
      {/* front intake fans (behind front glass) */}
      {frontFans.map((y) => (
        <group key={y} position={[0, y, half.z - t - radiusOffset(width)]} rotation={[Math.PI / 2, 0, 0]}>
          <Fan radius={7} speed={1.1} frame={false} />
        </group>
      ))}
      {/* power button + accent strip on top front */}
      <mesh position={[width / 2 - 6, half.y - t / 2 - 0.4, half.z - 6]}>
        <cylinderGeometry args={[1.1, 1.1, 0.5, 20]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.4} />
      </mesh>
      <mesh position={[0, half.y - t / 2 - 0.2, half.z - 14]}>
        <boxGeometry args={[width * 0.5, 0.4, 0.6]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.9} />
      </mesh>
      {/* motherboard tray */}
      <mesh position={[-half.x + t + 0.4, 0, -6]}>
        <boxGeometry args={[0.6, height - 10, depth - 14]} />
        <meshStandardMaterial color={C.casePanel} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Small helper so front fans sit just behind the front glass. */
function radiusOffset(width: number) {
  return 1.2 + width * 0.02;
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

function MotherboardModel({ anchor }: { anchor: SlotAnchor }) {
  const [sx, sy] = anchor.size;
  return (
    <group>
      <mesh>
        <boxGeometry args={[sx, sy, anchor.size[2]]} />
        <meshStandardMaterial color={C.pcb} roughness={0.65} />
      </mesh>
      {/* CPU socket */}
      <mesh position={[-sx * 0.18, sy * 0.22, anchor.size[2] / 2 + 0.3]}>
        <boxGeometry args={[sx * 0.26, sx * 0.26, 0.6]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.4} />
      </mesh>
      {/* VRM heatsinks */}
      <group position={[-sx * 0.18, sy * 0.42, anchor.size[2] / 2 + 0.8]}>
        <FinStack width={sx * 0.5} height={sy * 0.1} depth={1.6} count={5} />
      </group>
      <group position={[-sx * 0.42, sy * 0.05, anchor.size[2] / 2 + 0.8]} rotation={[0, 0, Math.PI / 2]}>
        <FinStack width={sx * 0.36} height={sy * 0.1} depth={1.6} count={4} />
      </group>
      {/* RAM slots */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[sx * 0.18 + i * 1.4, sy * 0.28, anchor.size[2] / 2 + 0.35]}>
          <boxGeometry args={[0.7, sy * 0.42, 0.7]} />
          <meshStandardMaterial color={C.black} roughness={0.5} />
        </mesh>
      ))}
      {/* PCIe slots */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[sx * 0.1, -sy * (0.18 + i * 0.16), anchor.size[2] / 2 + 0.3]}>
          <boxGeometry args={[sx * 0.55, 0.8, 0.6]} />
          <meshStandardMaterial color={C.black} roughness={0.5} />
        </mesh>
      ))}
      {/* chipset heatsink */}
      <mesh position={[sx * 0.3, -sy * 0.32, anchor.size[2] / 2 + 0.5]}>
        <boxGeometry args={[sx * 0.2, sx * 0.2, 1]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.4} />
      </mesh>
      {/* 24-pin connector */}
      <mesh position={[sx * 0.42, sy * 0.3, anchor.size[2] / 2 + 0.5]}>
        <boxGeometry args={[1.2, sy * 0.22, 1]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
    </group>
  );
}

function CpuModel() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[6.4, 6.4, 0.9]} />
        <meshStandardMaterial color={C.pcb} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.65]}>
        <boxGeometry args={[5, 5, 0.5]} />
        <meshStandardMaterial color={C.metal} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[2.9, -2.9, 0.3]}>
        <boxGeometry args={[0.5, 0.5, 0.7]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function CoolerModel({ spinning }: { spinning: boolean }) {
  return (
    <group>
      {/* fin tower */}
      <group position={[0, 1, 0]}>
        <FinStack width={11} height={11} depth={9} count={12} />
      </group>
      {/* heatpipes */}
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, -6, 2.2]}>
          <cylinderGeometry args={[0.55, 0.55, 5, 12]} />
          <meshStandardMaterial color={C.metal} metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* base */}
      <mesh position={[0, -8.6, 1]}>
        <boxGeometry args={[10.5, 1, 6]} />
        <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* fan on the tower */}
      <group position={[0, 1, 5.2]}>
        <Fan radius={4.6} spinning={spinning} speed={2} />
      </group>
    </group>
  );
}

function RamModel() {
  return (
    <group>
      {[-3.4, 3.4].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh>
            <boxGeometry args={[4.4, 13, 1.4]} />
            <meshStandardMaterial color={C.black} roughness={0.5} />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <boxGeometry args={[4.6, 1.6, 1.8]} />
            <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <boxGeometry args={[4.2, 0.6, 1.4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GpuModel({ anchor }: { anchor: SlotAnchor }) {
  const [sx, sy, sz] = anchor.size;
  return (
    <group>
      {/* shroud */}
      <RoundedBox args={[sx, sy, sz]} radius={0.7} smoothness={4}>
        <meshStandardMaterial color={C.caseDark} roughness={0.45} />
      </RoundedBox>
      {/* backplate */}
      <mesh position={[0, sy / 2 + 0.25, 0]}>
        <boxGeometry args={[sx * 0.96, 0.5, sz * 0.94]} />
        <meshStandardMaterial color={C.metalDark} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* three fans on the bottom face */}
      {[-sx * 0.3, 0, sx * 0.3].map((x) => (
        <group key={x} position={[x, -sy / 2 - 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Fan radius={sy * 0.42} spinning speed={1.7} frame={false} />
        </group>
      ))}
      {/* IO bracket */}
      <mesh position={[-sx / 2 - 0.5, 0, 0]}>
        <boxGeometry args={[1, sy * 1.15, sz * 0.9]} />
        <meshStandardMaterial color={C.metal} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* PCIe gold fingers */}
      <mesh position={[sx * 0.1, -sy / 2 - 0.9, 0]}>
        <boxGeometry args={[sx * 0.42, 0.7, sz * 0.35]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
      {/* 8-pin power connector on top edge */}
      <mesh position={[sx * 0.28, sy / 2 + 0.7, -sz * 0.1]}>
        <boxGeometry args={[4.5, 1.4, 2.6]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
      {/* side light strip */}
      <mesh position={[0, sy * 0.2, sz / 2 + 0.15]}>
        <boxGeometry args={[sx * 0.7, 0.7, 0.3]} />
        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function PsuModel({ anchor, hasError }: { anchor: SlotAnchor; hasError: boolean }) {
  const [sx, sy, sz] = anchor.size;
  return (
    <group>
      <RoundedBox args={[sx, sy, sz]} radius={0.5} smoothness={3}>
        <meshStandardMaterial color={C.caseDark} roughness={0.5} />
      </RoundedBox>
      {/* fan intake on top face */}
      <group position={[0, sy / 2 + 0.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[sy * 0.42, 0.3, 8, 32]} />
          <meshStandardMaterial color={C.metalDark} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, sy / 2 + 0.05, 0]}>
            <cylinderGeometry args={[sy * (0.1 + i * 0.11), sy * (0.1 + i * 0.11), 0.2, 24]} />
            <meshStandardMaterial color={C.metalDark} roughness={0.5} />
          </mesh>
        ))}
      </group>
      {/* modular sockets on the side */}
      <group position={[sx / 2 + 0.1, 0, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, sy * 0.22 - i * (sy * 0.3), sz * 0.15]}>
            <boxGeometry args={[0.4, sy * 0.18, sz * 0.28]} />
            <meshStandardMaterial color={hasError ? "#7f1d1d" : C.plastic} roughness={0.5} />
          </mesh>
        ))}
      </group>
      {/* label plate */}
      <mesh position={[0, 0, sz / 2 + 0.1]}>
        <boxGeometry args={[sx * 0.6, sy * 0.4, 0.2]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.6} />
      </mesh>
    </group>
  );
}

function StorageModel({ accent }: { accent: string }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <boxGeometry args={[3.2, 13, 0.7]} />
        <meshStandardMaterial color={C.pcbDark} roughness={0.6} />
      </mesh>
      {/* gold connector */}
      <mesh position={[0, -6.6, 0]}>
        <boxGeometry args={[2.4, 1.2, 0.5]} />
        <meshStandardMaterial color={C.gold} metalness={0.9} roughness={0.3} />
      </mesh>
      {/* controller + NAND chips */}
      <mesh position={[0, 1.5, 0.45]}>
        <boxGeometry args={[2.6, 2.6, 0.4]} />
        <meshStandardMaterial color={C.black} roughness={0.5} />
      </mesh>
      {[-1.6, 1.6].map((y) => (
        <mesh key={y} position={[0, 4.2 + y * 0.5, 0.45]}>
          <boxGeometry args={[2.8, 3.4, 0.35]} />
          <meshStandardMaterial color={C.plastic} roughness={0.5} />
        </mesh>
      ))}
      {/* label sticker */}
      <mesh position={[0, -2.5, 0.5]}>
        <boxGeometry args={[2.8, 3, 0.15]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
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
}: {
  category: string;
  anchor: SlotAnchor;
  accent: string;
  hasError: boolean;
  onClick: () => void;
}) {
  const group = useRef<Group>(null);
  useErrorPulse(group, hasError);
  const [hovered, setHovered] = useState(false);
  useEffect(() => () => {
    document.body.style.cursor = "default";
  }, []);

  const model = (() => {
    switch (category) {
      case "motherboard":
        return <MotherboardModel anchor={anchor} />;
      case "cpu":
        return <CpuModel />;
      case "cooler":
        return <CoolerModel spinning />;
      case "ram":
        return <RamModel />;
      case "gpu":
        return <GpuModel anchor={anchor} />;
      case "psu":
        return <PsuModel anchor={anchor} hasError={hasError} />;
      case "storage":
        return <StorageModel accent={accent} />;
      default:
        return null;
    }
  })();

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
}: {
  selection: Record<string, unknown>;
  accents: Record<string, string>;
  errorCategories: Set<string>;
  onPartClick: (category: string) => void;
  autoRotate: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[45, 70, 55]} intensity={1.5} />
      <directionalLight position={[-40, 20, -45]} intensity={0.4} />
      <pointLight position={[0, 0, 45]} intensity={0.5} />
      <CaseModel />
      {Object.entries(SLOT_LAYOUT)
        .filter(([slug]) => slug !== "case")
        .map(([slug, anchor]) =>
          selection[slug] ? null : (
            <group
              key={`ghost-${slug}`}
              onClick={(event) => {
                if (event.delta > 4) return;
                event.stopPropagation();
                onPartClick(slug);
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
      {Object.entries(SLOT_LAYOUT)
        .filter(([slug]) => slug !== "case" && selection[slug])
        .map(([slug, anchor]) => (
          <PartModel
            key={`part-${slug}`}
            category={slug}
            anchor={anchor}
            accent={accents[slug] ?? "#52525b"}
            hasError={errorCategories.has(slug)}
            onClick={() => onPartClick(slug)}
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
    { selection, accents, errorCategories, onPartClick },
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
        camera={{ position: [62, 30, 74], fov: 40 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene
          selection={selection}
          accents={accents}
          errorCategories={errorCategories}
          onPartClick={onPartClick}
          autoRotate={autoRotate}
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
