import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store/useStore.js';
import { M } from '../objects/materials.js';
import { PROD, PROD_DOOR, PROD_LAMPS } from './layout.js';
import { reducedMotion } from './capability.js';
import { prodDoor } from './actors.js';

const { x0, x1, zB, zF, h } = PROD;
const DEPTH = zF - zB, ZC = (zF + zB) / 2;
const DL = PROD_DOOR.x - PROD_DOOR.w / 2, DR = PROD_DOOR.x + PROD_DOOR.w / 2;
const RX0 = x0 - 0.3, RX1 = x1 + 0.3, RZ0 = zB - 0.2, RZ1 = zF + 0.7; // atap + teritisan depan
const RW = RX1 - RX0, RD = RZ1 - RZ0, RCX = (RX0 + RX1) / 2, RCZ = (RZ0 + RZ1) / 2;
const OVEN_X = -7.2 + (PROD.cx + 5), OVEN_Z = -3; // cerobong tepat di atas oven (sama dengan layout.js)

// Dinding kaca: dasar krem + kaca + tiang marun + balok kepala. Sumbu lokal x = panjang dinding.
function GlassWall({ pos, len, rotY = 0 }) {
  const posts = Math.max(2, Math.round(len / 1.8) + 1);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.3, 0]} material={M.cream}><boxGeometry args={[len, 0.6, 0.16]} /></mesh>
      <mesh position={[0, 0.61, 0]} material={M.gold}><boxGeometry args={[len, 0.03, 0.2]} /></mesh>
      <mesh position={[0, 1.85, 0]} material={M.glass} raycast={() => null}><boxGeometry args={[len, 2.5, 0.04]} /></mesh>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (i * len) / (posts - 1), 1.85, 0]} material={M.marun}><boxGeometry args={[0.08, 2.5, 0.12]} /></mesh>
      ))}
      <mesh position={[0, 3.1, 0]} material={M.marun}><boxGeometry args={[len, 0.08, 0.14]} /></mesh>
      <mesh position={[0, 3.4, 0]} material={M.cream}><boxGeometry args={[len, 0.6, 0.16]} /></mesh>
    </group>
  );
}

// Pintu kaca ganda geser otomatis: dua daun bergeser ke samping (sedikit di depan dinding agar tidak
// menembus tiang) selama ada yang mendekat. Sinyalnya: prodDoor.until (diisi dari scene/Delivery.jsx).
function Doors() {
  const { x, w } = PROD_DOOR, lw = w / 2;
  const invalidate = useThree((s) => s.invalidate);
  const leaf = useRef([]);
  const open = useRef(0);
  const place = (v) => {
    leaf.current.forEach((g, i) => {
      if (!g) return;
      const d = i === 0 ? -1 : 1;
      g.position.set(x + (d * lw) / 2 + d * v * (lw - 0.1), 0, zF + 0.1 * Math.min(1, v * 25));
    });
  };
  useFrame((_, dt) => {
    const want = performance.now() < prodDoor.until ? 1 : 0;
    const d = want - open.current;
    if (Math.abs(d) < 0.004) {
      if (open.current !== want) { open.current = want; place(want); }
      if (want) invalidate(); // tetap berdetak selama pintu ditahan terbuka, agar penutupan terdeteksi
      return;
    }
    open.current = reducedMotion() ? want : open.current + d * Math.min(1, dt * 7);
    place(open.current);
    invalidate();
  });
  return (
    <>
      {[-1, 1].map((d, i) => (
        <group key={d} ref={(el) => { leaf.current[i] = el; }} position={[x + (d * lw) / 2, 0, zF]}>
          <mesh position={[0, 1.25, 0]} material={M.glass} raycast={() => null}><boxGeometry args={[lw - 0.1, 2.3, 0.03]} /></mesh>
          <mesh position={[0, 0.1, 0]} material={M.marun}><boxGeometry args={[lw, 0.2, 0.07]} /></mesh>
          <mesh position={[0, 2.45, 0]} material={M.marun}><boxGeometry args={[lw, 0.1, 0.07]} /></mesh>
          <mesh position={[d * (lw / 2 - 0.03), 1.25, 0]} material={M.marun}><boxGeometry args={[0.06, 2.4, 0.07]} /></mesh>
          <mesh position={[-d * (lw / 2 - 0.03), 1.25, 0]} material={M.marun}><boxGeometry args={[0.06, 2.4, 0.07]} /></mesh>
          <mesh position={[-d * 0.14, 1.1, 0.07]} material={M.gold}><boxGeometry args={[0.03, 0.5, 0.03]} /></mesh>
        </group>
      ))}
      <mesh position={[x, 2.8, zF]} material={M.glass} raycast={() => null}><boxGeometry args={[w, 0.6, 0.04]} /></mesh>
      <mesh position={[x, 2.55, zF]} material={M.marun}><boxGeometry args={[w, 0.1, 0.1]} /></mesh>
      <mesh position={[x, 3.4, zF]} material={M.cream}><boxGeometry args={[w, 0.6, 0.16]} /></mesh>
      {[DL, DR].map((px) => <mesh key={px} position={[px, 1.55, zF]} material={M.marun}><boxGeometry args={[0.1, 3.1, 0.14]} /></mesh>)}
      <mesh position={[x, 0.02, zF]} material={M.gold}><boxGeometry args={[w, 0.02, 0.3]} /></mesh>
      <mesh position={[x, 0.012, zF + 0.75]} material={M.marun}><boxGeometry args={[Math.min(w, 2.2), 0.024, 0.8]} /></mesh>
    </>
  );
}

// Atap: mengikuti mode yang sama dengan Outlet (store.roof): 'ghost' | 'solid' | 'off'
function Roof() {
  const mode = useStore((s) => s.roof);
  const invalidate = useThree((s) => s.invalidate);
  const g = useRef(), o = useRef(0.22);
  const mats = useMemo(() => ['#F3E9DA', '#6B1F23', '#B07A3A', '#C9C4BC'].map((c) => new THREE.MeshLambertMaterial({ color: c })), []);
  const apply = (v) => {
    mats.forEach((m) => {
      const t = v < 0.999;
      if (m.transparent !== t) { m.transparent = t; m.depthWrite = !t; m.needsUpdate = true; }
      m.opacity = v;
    });
    if (g.current) g.current.visible = v > 0.01;
  };
  useEffect(() => { apply(o.current); }, []); // eslint-disable-line
  useEffect(() => { invalidate(); }, [mode, invalidate]);
  useFrame((_, dt) => {
    const target = mode === 'solid' ? 1 : mode === 'ghost' ? 0.22 : 0;
    const d = target - o.current;
    if (Math.abs(d) < 0.003) { if (o.current !== target) { o.current = target; apply(target); } return; }
    o.current = reducedMotion() ? target : o.current + d * Math.min(1, dt * 7);
    apply(o.current);
    invalidate();
  });
  const y = h + 0.08;
  return (
    <group ref={g}>
      <mesh position={[RCX, y, RCZ]} material={mats[0]}><boxGeometry args={[RW, 0.16, RD]} /></mesh>
      {/* fasia marun di keempat sisi + garis emas di depan */}
      <mesh position={[RCX, y + 0.02, RZ1]} material={mats[1]}><boxGeometry args={[RW + 0.1, 0.34, 0.12]} /></mesh>
      <mesh position={[RCX, y + 0.02, RZ0]} material={mats[1]}><boxGeometry args={[RW + 0.1, 0.34, 0.12]} /></mesh>
      <mesh position={[RX0, y + 0.02, RCZ]} material={mats[1]}><boxGeometry args={[0.12, 0.34, RD]} /></mesh>
      <mesh position={[RX1, y + 0.02, RCZ]} material={mats[1]}><boxGeometry args={[0.12, 0.34, RD]} /></mesh>
      <mesh position={[RCX, y + 0.02, RZ1 + 0.065]} material={mats[2]}><boxGeometry args={[RW, 0.03, 0.01]} /></mesh>
      {/* cerobong oven (menembus atap tepat di atas oven) */}
      <group position={[OVEN_X, y + 0.78, OVEN_Z]}>
        <mesh material={mats[3]}><cylinderGeometry args={[0.22, 0.26, 1.5, 12]} /></mesh>
        <mesh position={[0, 0.2, 0]} material={mats[2]}><cylinderGeometry args={[0.265, 0.265, 0.05, 12]} /></mesh>
        <mesh position={[0, 0.82, 0]} material={mats[1]}><cylinderGeometry args={[0.32, 0.3, 0.12, 12]} /></mesh>
      </group>
      {/* rumah ventilasi */}
      {[PROD.cx + 1.2, PROD.cx + 3.0].map((vx) => (
        <group key={vx} position={[vx, y + 0.2, -1.5]}>
          <mesh material={mats[0]}><boxGeometry args={[1.4, 0.24, 1.0]} /></mesh>
          <mesh position={[0, 0.13, 0]} material={mats[1]}><boxGeometry args={[1.5, 0.04, 1.1]} /></mesh>
        </group>
      ))}
      {/* tiang teritisan depan */}
      {[RX0 + 0.18, RX1 - 0.18].map((px) => (
        <mesh key={px} position={[px, h / 2, RZ1 - 0.18]} material={mats[1]}><cylinderGeometry args={[0.07, 0.08, h, 8]} /></mesh>
      ))}
    </group>
  );
}

export default function ProdBuilding({ night }) {
  return (
    <>
      {/* dinding kaca kiri, kanan, dan muka depan (dua segmen + pintu ganda); dinding belakang ada di Zone */}
      <GlassWall pos={[x0, 0, ZC]} len={DEPTH} rotY={Math.PI / 2} />
      <GlassWall pos={[x1, 0, ZC]} len={DEPTH} rotY={Math.PI / 2} />
      <GlassWall pos={[(x0 + DL) / 2, 0, zF]} len={DL - x0} />
      <GlassWall pos={[(DR + x1) / 2, 0, zF]} len={x1 - DR} />
      <Doors />
      <Roof />

      {/* malam: bercak cahaya hangat di lantai di bawah tiap lampu (murah, tanpa cahaya titik tambahan) */}
      {night && PROD_LAMPS.map((l) => (
        <mesh key={`${l.x}-${l.z}`} position={[l.x, 0.02, l.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.4, 24]} />
          <meshBasicMaterial color="#FFD38A" transparent opacity={0.17} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}