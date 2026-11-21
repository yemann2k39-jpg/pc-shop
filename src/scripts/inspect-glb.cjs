// Dump GLB structure: node/mesh names + per-mesh world-ish bounding boxes.
// Usage: node src/scripts/inspect-glb.cjs public/models/case.glb
const fs = require("fs");

const buf = fs.readFileSync(process.argv[2]);
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) throw new Error("not a GLB");
let off = 12;
let json = null;
let binOffset = 0;
while (off < buf.length) {
  const len = buf.readUInt32LE(off);
  const type = buf.readUInt32LE(off + 4);
  if (type === 0x4e4f534a) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString("utf8"));
  if (type === 0x004e4942) binOffset = off + 8;
  off += 8 + len;
}
if (!json) throw new Error("no JSON chunk");

const nodes = json.nodes || [];
const meshes = json.meshes || [];
const accessors = json.accessors || [];

function bboxOfMesh(mesh) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const prim of mesh.primitives || []) {
    const acc = accessors[prim.attributes.POSITION];
    if (!acc || !acc.min || !acc.max) continue;
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], acc.min[i]);
      max[i] = Math.max(max[i], acc.max[i]);
    }
  }
  return { min, max };
}

console.log("scene nodes:", nodes.length, "| meshes:", meshes.length);
nodes.forEach((n, i) => {
  const meshInfo = n.mesh != null ? meshes[n.mesh] : null;
  if (meshInfo) {
    const bb = bboxOfMesh(meshInfo);
    const size = bb.min.map((m, k) => (bb.max[k] - m).toFixed(2));
    console.log(
      `[${i}] mesh=${(n.name || meshInfo.name || "unnamed").slice(0, 40)} ` +
        `prims=${meshInfo.primitives.length} size=${size.join("x")} ` +
        `min=[${bb.min.map((v) => v.toFixed(1)).join(",")}]`
    );
  } else if (n.name) {
    console.log(`[${i}] node=${n.name.slice(0, 40)}`);
  }
});
