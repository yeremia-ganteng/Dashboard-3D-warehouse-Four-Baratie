import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { SITE, SIM, LANES, DOOR, GUDANG, WALKWAY as W } from './layout.js';

/* ============ Jalur pejalan kaki ============
   Overlay transparan di atas trotoar dan halaman (tanpa cahaya titik, tanpa animasi).
   Semua bentuk = InstancedMesh (5 draw call). Raycast dimatikan supaya klik/hover objek di bawahnya tetap jalan. */

const { road, padProdX, padOutX } = SITE;
const S = W.style, f = W.front, b = W.back, c = W.court;
const X0 = road.x0, X1 = road.x1, CX = (X0 + X1) / 2;
const ZX = (padProdX + padOutX) / 2;          // zebra cross (sama dengan Site.jsx)
const Y = W.y, YM = W.y + 0.006, YD = W.y + 0.01;
const YC = W.courtY, YCM = W.courtY + 0.006;

// InstancedMesh kecil. Item = [x, y, z, sx, sy, sz] (memakai rotX) atau [x, y, z, sx, sy, sz, rx, ry, rz]
function Inst({ items, rotX = 0, order = 1, children }) {
  const ref = useRef();
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!ref.current || !items.length) return;
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, 0, 0));
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach(([x, y, z, sx, sy, sz, rx, ry, rz], i) => {
      m.compose(p.set(x, y, z), rx === undefined ? q0 : q.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [items, rotX, invalidate]);
  if (!items.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false} raycast={() => null} renderOrder={order}>
      {children}
    </instancedMesh>
  );
}

// Potong rentang [x0, x1] oleh celah-celah (mis. di depan pintu atau dok)
function segs(x0, x1, gaps) {
  let out = [[x0, x1]];
  gaps.forEach(([g0, g1]) => {
    out = out.flatMap(([a, bb]) => [[a, Math.min(bb, g0)], [Math.max(a, g1), bb]]).filter(([u, v]) => v - u > 0.05);
  });
  return out;
}
const line = (a, bb, z, y) => [(a + bb) / 2, y, z, bb - a, 0.002, 0.03];

// Panah (chevron) berujung di (x, z), menunjuk ke arah (hx, hz): dua batang tipis
function chevron(x, z, hx, hz, y, a = 0.1, bw = 0.11, t = 0.035) {
  const sx = hz, sz = -hx, len = Math.hypot(a, bw) + 0.01;
  return [1, -1].map((sg) => {
    const dx = -hx * a + sg * sx * bw, dz = -hz * a + sg * sz * bw;
    return [x + dx / 2, y, z + dz / 2, len, 0.002, t, 0, Math.atan2(-dz, dx), 0];
  });
}

/* ---------- Data (dihitung sekali) ---------- */
const GAP_DOOR = [DOOR.x - 0.7, DOOR.x + 0.7];
const GAP_ZEBRA = [ZX - 1.4, ZX + 1.4];
const GAP_DOCKS = [[padOutX - 2.1, padOutX + 2.1], [padProdX - 2.1, padProdX + 2.1], [GUDANG.doorX - 0.8, GUDANG.doorX + 0.8]];

// Dasar jalur (bidang datar; bentuk 1x1 diskalakan: sx = panjang x, sy = panjang z)
const BAND = [[CX, Y, (f.z0 + f.z1) / 2, X1 - X0, f.z1 - f.z0, 1]];
if (W.showBack) BAND.push([CX, Y, (b.z0 + b.z1) / 2, X1 - X0, b.z1 - b.z0, 1]);
BAND.push([c.x, YC, (c.z0 + c.z1) / 2, c.w, c.z1 - c.z0, 1]);

// Garis tepi
const EDGES = [];
segs(X0 + 0.2, X1 - 0.2, [GAP_DOOR, ...GAP_DOCKS, GAP_ZEBRA]).forEach(([a, bb]) => EDGES.push(line(a, bb, f.z0 + 0.1, YM)));
segs(X0 + 0.2, X1 - 0.2, [GAP_ZEBRA]).forEach(([a, bb]) => EDGES.push(line(a, bb, f.z1 - 0.1, YM)));
if (W.showBack) {
  segs(X0 + 0.2, X1 - 0.2, [GAP_ZEBRA]).forEach(([a, bb]) => {
    EDGES.push(line(a, bb, b.z0 + 0.1, YM), line(a, bb, b.z1 - 0.1, YM));
  });
}
[-1, 1].forEach((d) => EDGES.push([c.x + d * (c.w / 2 - 0.04), YCM, (c.z0 + c.z1) / 2, 0.03, 0.002, c.z1 - c.z0]));

// Panah arah: trotoar depan (lajur barat & timur) + jalur halaman (masuk & keluar pintu)
const MARKS = [];
const ok = (x) => Math.abs(x - DOOR.x) >= 0.9 && Math.abs(x - ZX) >= 1.4;
for (let x = X0 + 1.5; x < X1 - 1.2; x += W.step) {
  if (ok(x)) MARKS.push(...chevron(x, LANES.walkW, -1, 0, YM));
  const xe = x + W.step / 2;
  if (xe < X1 - 1.2 && ok(xe)) MARKS.push(...chevron(xe, LANES.walkE, 1, 0, YM));
}
for (let z = c.z1 - 0.5; z > c.z0 + 0.25; z -= 0.75) {
  MARKS.push(...chevron(SIM.doorInX, z, 0, -1, YCM));   // masuk (menuju pintu)
  MARKS.push(...chevron(SIM.doorOutX, z, 0, 1, YCM));   // keluar (menuju trotoar)
}

// Titik taktil di ujung zebra cross, kedua trotoar
const DOTS = [];
const dots = (zs) => zs.forEach((z) => { for (let i = -6; i <= 6; i++) DOTS.push([ZX + i * 0.18, YD, z, 1, 1, 1]); });
dots([f.z1 - 0.12, f.z1 - 0.27, f.z1 - 0.42]);
if (W.showBack) dots([b.z0 + 0.12, b.z0 + 0.27, b.z0 + 0.42]);

export default function Walkways({ night }) {
  const k = night ? S.nightK : 1;
  const mat = (color, op) => (
    <meshBasicMaterial color={color} transparent opacity={op * k} depthWrite={false}
      polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
  );
  return (
    <group>
      <Inst items={BAND} rotX={-Math.PI / 2} order={1}><planeGeometry args={[1, 1]} />{mat(S.band, S.bandOp)}</Inst>
      <Inst items={EDGES} order={2}><boxGeometry args={[1, 1, 1]} />{mat(S.edge, S.edgeOp)}</Inst>
      <Inst items={MARKS} order={3}><boxGeometry args={[1, 1, 1]} />{mat(S.mark, S.markOp)}</Inst>
      <Inst items={DOTS} order={3}><cylinderGeometry args={[0.035, 0.035, 0.01, 8]} />{mat(S.dot, S.dotOp)}</Inst>
    </group>
  );
}