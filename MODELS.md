# 3D models — decision record

## Decision (TCK-23)

The builder's 3D view uses **code-primitive stylized models** (boxes,
cylinders, and edge outlines composed in `src/components/build-viewer.tsx`),
not downloaded GLB assets.

### Why

- **Guaranteed style consistency** across all 8 categories — sourced
  low-poly models from different authors never quite match.
- **Zero licensing overhead** — nothing to attribute, nothing to redownload.
- **No external downloads** at build time; the whole scene is deterministic
  code, version-controlled like the rest of the app.
- The stylized "technical mock-up" look matches the flat, illustrated
  placeholder images used elsewhere in the shop.

### Trade-off

Parts are recognizable silhouettes, not realistic product replicas. If
realistic models are wanted later, see below.

## Layout

Slot anchors live in `src/lib/build-scene.ts` (`SLOT_LAYOUT`): one entry per
category with a position + footprint inside the case box. Ghost markers
(empty slots) and part models both derive from these anchors — adjusting a
slot means editing one line there.

## Swapping in sourced GLB models later

1. Source CC0/CC-BY low-poly GLBs (Sketchfab, Kenney, Poly Pizza) — one per
   category, consistent style.
2. Place them in `public/models/{category}.glb`.
3. Record source URL, author, and license for each in this file.
4. Replace the primitive part components in `src/components/build-viewer.tsx`
   with `useGLTF("/models/{category}.glb")` instances anchored to the same
   `SLOT_LAYOUT` positions (adjust per-model offsets as needed).

**License rule:** CC0 preferred; CC-BY acceptable with attribution in this
file; anything non-commercial is rejected.
