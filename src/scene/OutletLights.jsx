import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OUTLET, OUTLET_LIGHTS as L } from './layout.js';

/* ============ Lampu Outlet: dalam + halaman ============
   Hemat untuk HP: semua lampu = InstancedMesh (bola/cakram emisif), bercak cahaya = cakram transparan di
   lantai, dan hanya L.point yang berupa cahaya titik sungguhan (maks 2, mati di mode `low`).
   Siang: lampu terlihat tapi mati. Malam: menyala. */

const PI = Math.PI;

// InstancedMesh kecil. Tiap item = [x, y, z, sx, sy, sz, rx, ry, rz]; order = urutan rotasi Euler
function Inst({ items, order = 'XYZ', children }) {
  const ref = useRef();
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach(([x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0], i) => {
      m.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, order)), s.set(sx, sy, sz));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [items, order, invalidate]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false} raycast={() => null}>
      {children}
    </instancedMesh>
  );
}

// Untai lampu: kurva parabola dari a ke b. Menghasilkan potongan kabel + posisi bohlam
function festoon(a, b, sag, every) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const n = 2 * Math.max(2, Math.round(len / every));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  });
  const wires = [], bulbs = [];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i];
    const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], l = Math.hypot(dx, dy, dz);
    wires.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, 1, 1, l, -Math.asin(dy / l), Math.atan2(dx, dz), 0]);
  }
  for (let i = 2; i < n; i += 2) bulbs.push([pts[i][0], pts[i][1] - 0.08, pts[i][2]]);
  return { wires, bulbs };
}

/* ---------- Data posisi (dihitung sekali) ---------- */
const SP = L.spots, Y = L.yard, BL = L.bollards;
const rodTop = OUTLET.h, rodBot = L.spotY + 0.07;
const SPOT_ROD = SP.map(([x, z]) => [x, (rodTop + rodBot) / 2, z, 1, rodTop - rodBot, 1]);
const SPOT_BODY = SP.map(([x, z]) => [x, L.spotY, z]);
const SPOT_EMIT = SP.map(([x, z]) => [x, L.spotY - 0.072, z, 1, 1, 1, PI / 2, 0, 0]); // cakram menghadap ke bawah
const SPOT_POOL = SP.map(([x, z]) => [x, 0.022, z, L.poolR, L.poolR, 1, -PI / 2, 0, 0]);

const LINES = [
  festoon([Y.postX[0], Y.postY, Y.postZ], [Y.postX[1], Y.postY, Y.postZ], Y.sag, Y.bulbEvery),
  festoon([Y.poleX[0], Y.topY, Y.poleZ], [Y.poleX[1], Y.topY, Y.poleZ], Y.sag, Y.bulbEvery),
  festoon([Y.postX[0], Y.postY, Y.postZ], [Y.poleX[0], Y.topY, Y.poleZ], 0.15, Y.bulbEvery),
  festoon([Y.postX[1], Y.postY, Y.postZ], [Y.poleX[1], Y.topY, Y.poleZ], 0.15, Y.bulbEvery),
];
const WIRES = LINES.flatMap((l) => l.wires);
const BULBS = LINES.flatMap((l) => l.bulbs);
const POLES = Y.poleX.map((x) => [x, (Y.topY + 0.06) / 2, Y.poleZ, 1, Y.topY + 0.06, 1]);
const YARD_POOL = Y.pools.map(([x, z, r]) => [x, 0.022, z, r, r, 1, -PI / 2, 0, 0]);

const BOL_POST = BL.x.map((x) => [x, 0.35, BL.z, 1, 0.7, 1]);
const BOL_HEAD = BL.x.map((x) => [x, 0.78, BL.z]);
const BOL_POOL = BL.x.map((x) => [x, 0.022, BL.z, BL.poolR, BL.poolR, 1, -PI / 2, 0, 0]);

export default function OutletLights({ night, low }) {
  const bulb = night ? '#FFE7A3' : '#EFE8D8';
  const spotCol = night ? '#FFE2A0' : '#E8E0D0';
  const poolMat = <meshBasicMaterial color="#FFD38A" transparent opacity={L.glow} depthWrite={false} />;
  return (
    <group>
      {/* ===== Dalam Outlet: lampu sorot gantung ===== */}
      <Inst items={SPOT_ROD}><boxGeometry args={[0.016, 1, 0.016]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={SPOT_BODY}><cylinderGeometry args={[0.07, 0.17, 0.14, 14]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={SPOT_EMIT}><circleGeometry args={[0.13, 16]} /><meshBasicMaterial color={spotCol} /></Inst>

      {/* ===== Halaman: lampu untai + tiang ===== */}
      <Inst items={POLES}><cylinderGeometry args={[0.035, 0.045, 1, 8]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={WIRES} order="YXZ"><boxGeometry args={[0.012, 0.012, 1]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={BULBS}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color={bulb} /></Inst>

      {/* ===== Lampu taman di celah antar pot ===== */}
      <Inst items={BOL_POST}><cylinderGeometry args={[0.035, 0.045, 1, 8]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={BOL_HEAD}><sphereGeometry args={[0.075, 10, 8]} /><meshBasicMaterial color={bulb} /></Inst>

      {/* ===== Malam: bercak cahaya + cahaya titik ===== */}
      {night && (
        <>
          <Inst items={SPOT_POOL}><circleGeometry args={[1, 24]} />{poolMat}</Inst>
          <Inst items={YARD_POOL}><circleGeometry args={[1, 24]} />{poolMat}</Inst>
          <Inst items={BOL_POOL}><circleGeometry args={[1, 20]} />{poolMat}</Inst>
        </>
      )}
      {night && !low && L.point.filter((p) => p.lit).map((p, i) => (
        <pointLight key={i} position={[p.x, p.y, p.z]} color="#FFD9A0" intensity={p.i} distance={p.d} decay={2} />
      ))}
    </group>
  );
}