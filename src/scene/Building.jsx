import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore.js';
import { M } from '../objects/materials.js';
import { OUTLET, DOOR, DOORSENS } from './layout.js';
import { doorReading } from './actors.js';
import { reducedMotion } from './capability.js';

const { x0, x1, zB, zF, cx, h } = OUTLET;
const W = x1 - x0, DEPTH = zF - zB, ZC = (zF + zB) / 2;
const DL = DOOR.x - DOOR.w / 2, DR = DOOR.x + DOOR.w / 2;
const RX0 = x0 - 0.3, RX1 = x1 + 0.3, RZ0 = zB - 0.2, RZ1 = zF + 0.7; // atap + teritisan depan
const RW = RX1 - RX0, RD = RZ1 - RZ0, RCX = (RX0 + RX1) / 2, RCZ = (RZ0 + RZ1) / 2;

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

// Satu daun pintu. dir = +1 (engsel kiri, daun ke +x) atau -1 (engsel kanan, daun ke -x)
function Leaf({ dir, hinge, leafRef }) {
  const lw = DOOR.w / 2, c = (dir * lw) / 2;
  return (
    <group ref={leafRef} position={[hinge, 0, zF]}>
      <mesh position={[c, 1.25, 0]} material={M.glass} raycast={() => null}><boxGeometry args={[lw - 0.1, 2.3, 0.03]} /></mesh>
      <mesh position={[c, 0.1, 0]} material={M.marun}><boxGeometry args={[lw, 0.2, 0.07]} /></mesh>
      <mesh position={[c, 2.45, 0]} material={M.marun}><boxGeometry args={[lw, 0.1, 0.07]} /></mesh>
      <mesh position={[dir * 0.03, 1.25, 0]} material={M.marun}><boxGeometry args={[0.06, 2.4, 0.07]} /></mesh>
      <mesh position={[dir * (lw - 0.03), 1.25, 0]} material={M.marun}><boxGeometry args={[0.06, 2.4, 0.07]} /></mesh>
      <mesh position={[dir * (lw - 0.14), 1.1, 0.07]} material={M.gold}><boxGeometry args={[0.03, 0.5, 0.03]} /></mesh>
    </group>
  );
}

// Pintu ganda: membuka ke luar saat ada pelanggan mendekat (sinyal dari Customers.jsx)
function Doors() {
  const l = useRef(), r = useRef(), ang = useRef(0), hold = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, dt) => {
    // Otomatis terbuka bila >= minPeople orang menuju pintu; satu orang saja membuka pintu dengan
    // "mendorong" setelah sangat dekat. Ditahan holdMs agar tidak berkedip.
    const now = performance.now(), { n, d: dist } = doorReading();
    if (n >= DOORSENS.minPeople || (n >= 1 && dist < DOORSENS.pushRange)) hold.current = now + DOORSENS.holdMs;
    const target = now < hold.current ? 1.45 : 0;
    if (ang.current === target) { if (target > 0) invalidate(); return; } // tetap berdetak selama terbuka
    const d = target - ang.current;
    ang.current = reducedMotion() || Math.abs(d) < 0.004 ? target : ang.current + d * Math.min(1, dt * 6);
    if (l.current) l.current.rotation.y = -ang.current; // daun kiri berayun ke luar (+z)
    if (r.current) r.current.rotation.y = ang.current;  // daun kanan berayun ke luar (+z)
    invalidate();
  });
  return (
    <>
      <Leaf dir={1} hinge={DL} leafRef={l} />
      <Leaf dir={-1} hinge={DR} leafRef={r} />
      <mesh position={[DOOR.x, 2.8, zF]} material={M.glass} raycast={() => null}><boxGeometry args={[DOOR.w, 0.6, 0.04]} /></mesh>
      <mesh position={[DOOR.x, 2.55, zF]} material={M.marun}><boxGeometry args={[DOOR.w, 0.1, 0.1]} /></mesh>
      <mesh position={[DOOR.x, 3.4, zF]} material={M.cream}><boxGeometry args={[DOOR.w, 0.6, 0.16]} /></mesh>
      {[DL, DR].map((x) => <mesh key={x} position={[x, 1.55, zF]} material={M.marun}><boxGeometry args={[0.1, 3.1, 0.14]} /></mesh>)}
      <mesh position={[DOOR.x, 0.02, zF]} material={M.gold}><boxGeometry args={[DOOR.w, 0.02, 0.3]} /></mesh>
      <mesh position={[DOOR.x, 0.012, zF + 0.75]} material={M.marun}><boxGeometry args={[1.7, 0.024, 0.8]} /></mesh>
    </>
  );
}

// Atap: tiga mode (store.roof) — 'ghost' transparan, 'solid' tertutup, 'off' tersembunyi. Berubah halus.
function Roof() {
  const mode = useStore((s) => s.roof);
  const invalidate = useThree((s) => s.invalidate);
  const g = useRef(), o = useRef(0.22);
  const mats = useMemo(() => ['#F3E9DA', '#6B1F23', '#B07A3A'].map((c) => new THREE.MeshLambertMaterial({ color: c })), []);
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
      {/* rumah ventilasi di atap */}
      {[5, 11].map((x) => (
        <group key={x} position={[x, y + 0.2, -1.5]}>
          <mesh material={mats[0]}><boxGeometry args={[1.6, 0.24, 1.1]} /></mesh>
          <mesh position={[0, 0.13, 0]} material={mats[1]}><boxGeometry args={[1.7, 0.04, 1.2]} /></mesh>
        </group>
      ))}
      {/* tiang teritisan depan */}
      {[RX0 + 0.18, RX1 - 0.18].map((x) => (
        <mesh key={x} position={[x, h / 2, RZ1 - 0.18]} material={mats[1]}><cylinderGeometry args={[0.07, 0.08, h, 8]} /></mesh>
      ))}
    </group>
  );
}

export default function Building() {
  return (
    <>
      {/* lantai marmer (diperlebar) + label zona */}
      <mesh position={[cx, -0.06, 0]} material={M.marble}><boxGeometry args={[W, 0.12, 8]} /></mesh>
      <Html position={[cx, 0.05, 3.45]} center pointerEvents="none"><div className="zonetag">OUTLET</div></Html>

      {/* dinding belakang */}
      <mesh position={[cx, h / 2, zB]} material={M.cream}><boxGeometry args={[W + 0.2, h, 0.15]} /></mesh>
      <mesh position={[cx, 0.1, zB + 0.09]} material={M.gold}><boxGeometry args={[W, 0.03, 0.03]} /></mesh>

      {/* dinding kaca kiri & kanan */}
      <GlassWall pos={[x0, 0, ZC]} len={DEPTH} rotY={Math.PI / 2} />
      <GlassWall pos={[x1, 0, ZC]} len={DEPTH} rotY={Math.PI / 2} />
      {/* muka depan: dua segmen kaca + pintu ganda di tengah-kanan */}
      <GlassWall pos={[(x0 + DL) / 2, 0, zF]} len={DL - x0} />
      <GlassWall pos={[(DR + x1) / 2, 0, zF]} len={x1 - DR} />
      <Doors />
      <Roof />
    </>
  );
}