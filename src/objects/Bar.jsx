import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { M } from './materials.js';
import { Espresso } from './Counter.jsx';
import { BAR, PICKUP } from '../scene/layout.js';
import { bar as barState } from '../scene/serving.js';

const TAU = Math.PI * 2;
const CUP_GLASS = new THREE.MeshLambertMaterial({ color: '#EAF2F4', transparent: true, opacity: 0.5, depthWrite: false });

// Bangku bar (sisi pelanggan)
function Stool({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} material={M.ink}><cylinderGeometry args={[0.2, 0.2, 0.04, 14]} /></mesh>
      <mesh position={[0, 0.36, 0]} material={M.ink}><cylinderGeometry args={[0.025, 0.025, 0.72, 8]} /></mesh>
      <mesh position={[0, 0.28, 0]} material={M.gold}><torusGeometry args={[0.13, 0.01, 6, 16]} /></mesh>
      <mesh position={[0, 0.74, 0]} material={M.marun}><cylinderGeometry args={[0.19, 0.17, 0.07, 16]} /></mesh>
    </group>
  );
}

// Tempat ambil minuman: cincin emas di meja pulau + gelas yang muncul saat minuman siap (serving.js -> bar.ready).
// Warna isi gelas mengikuti varian (serving.js -> bar.color).
function PickupCups() {
  const refs = useRef([]), liq = useRef([]), shown = useRef([]);
  useFrame(() => {
    PICKUP.slots.forEach((_, i) => {
      const g = refs.current[i];
      if (g && g.visible !== barState.ready[i]) g.visible = barState.ready[i];
      const m = liq.current[i], c = barState.color[i];
      if (m && shown.current[i] !== c) { m.color.set(c); shown.current[i] = c; }
    });
  });
  return (
    <>
      {PICKUP.slots.map((s, i) => (
        <group key={i} position={[s.cup[0], PICKUP.topY, s.cup[1]]}>
          <mesh position={[0, 0.005, 0]} material={M.gold}><cylinderGeometry args={[0.1, 0.1, 0.01, 22]} /></mesh>
          <group ref={(el) => { refs.current[i] = el; }} visible={false}>
            <mesh position={[0, 0.075, 0]} material={CUP_GLASS}><cylinderGeometry args={[0.045, 0.033, 0.13, 14]} /></mesh>
            <mesh position={[0, 0.058, 0]}>
              <cylinderGeometry args={[0.039, 0.03, 0.1, 14]} />
              <meshLambertMaterial ref={(m) => { liq.current[i] = m; }} color="#9A6A45" />
            </mesh>
            <mesh position={[0.012, 0.118, 0.006]} rotation={[0.4, 0.5, 0.2]}><boxGeometry args={[0.02, 0.02, 0.02]} /><meshLambertMaterial color="#F4FBFD" transparent opacity={0.75} /></mesh>
            <mesh position={[-0.014, 0.112, -0.008]} rotation={[0.4, 0.5, 0.2]}><boxGeometry args={[0.02, 0.02, 0.02]} /><meshLambertMaterial color="#F4FBFD" transparent opacity={0.75} /></mesh>
            <mesh position={[0, 0.145, 0]} material={M.marun}><cylinderGeometry args={[0.049, 0.049, 0.012, 14]} /></mesh>
            <mesh position={[0.008, 0.2, 0]} rotation={[0, 0, 0.12]}><cylinderGeometry args={[0.004, 0.004, 0.17, 6]} /><meshLambertMaterial color="#3E8E8A" /></mesh>
          </group>
        </group>
      ))}
    </>
  );
}

// Bar Kopi berbentuk meja pulau: pelanggan di sisi +z, barista di belakang (sisi -z) menghadap pelanggan.
// Mesin espresso diputar 180° agar bagian depannya menghadap barista; punggung mesin menghadap pelanggan.
export default function Bar() {
  const { cx, w, zC, machX } = BAR;
  return (
    <>
      {/* meja pulau */}
      <group position={[cx, 0, zC]}>
        <mesh position={[0, 0.5, 0]} material={M.cream}><boxGeometry args={[w, 1, 0.9]} /></mesh>
        <mesh position={[0, 0.07, 0.46]} material={M.marun}><boxGeometry args={[w, 0.14, 0.02]} /></mesh>
        <mesh position={[0, 0.8, 0.46]} material={M.gold}><boxGeometry args={[w, 0.02, 0.02]} /></mesh>
        <mesh position={[0, 0.45, 0.455]} material={M.marun}><boxGeometry args={[w - 0.4, 0.5, 0.01]} /></mesh>
        <mesh position={[0, 1.04, 0.02]} material={M.marble}><boxGeometry args={[w + 0.3, 0.08, 1.05]} /></mesh>

        {/* mesin espresso + grinder, diputar menghadap barista (-z) */}
        <group position={[machX - cx + 1.4, 0, 0]} rotation={[0, Math.PI, 0]}><Espresso /></group>

        {/* kiri: kubah kaca berisi roti (digeser ke kanan agar ujung kiri meja jadi tempat ambil minuman) */}
        <mesh position={[-1.4, 1.095, 0.05]} material={M.cream}><cylinderGeometry args={[0.3, 0.3, 0.03, 20]} /></mesh>
        <mesh position={[-1.4, 1.19, 0.05]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.07, 12, 8]} /><meshLambertMaterial color="#D9A66B" /></mesh>
        <mesh position={[-1.25, 1.19, 0.1]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.07, 12, 8]} /><meshLambertMaterial color="#8A5A36" /></mesh>
        <mesh position={[-1.4, 1.11, 0.05]} material={M.glass} raycast={() => null}><sphereGeometry args={[0.3, 16, 10, 0, TAU, 0, Math.PI / 2]} /></mesh>

        {/* kanan: knock box, pitcher susu, tumpukan cup */}
        <mesh position={[1.0, 1.15, 0.0]} material={M.ink}><boxGeometry args={[0.24, 0.14, 0.2]} /></mesh>
        {[1.45, 1.65].map((px) => (
          <mesh key={px} position={[px, 1.15, 0.05]} material={M.steel}><cylinderGeometry args={[0.055, 0.045, 0.14, 12]} /></mesh>
        ))}
        {[0, 0.04, 0.08].map((dy, i) => (
          <mesh key={i} position={[1.95, 1.12 + dy, 0.0]}><cylinderGeometry args={[0.06, 0.04, 0.12, 12]} /><meshLambertMaterial color="#F3F1EA" /></mesh>
        ))}

        {/* bangku bar di sisi pelanggan */}
        {[-1.3, 0, 1.3].map((sx) => <Stool key={sx} position={[sx, 0, 1.05]} />)}
      </group>

      {/* tempat ambil minuman (koordinat dunia) */}
      <PickupCups />

      {/* back bar di dinding belakang: kabinet, rak cup, kanister */}
      <group position={[cx, 0, -3.65]}>
        <mesh position={[0, 0.45, 0]} material={M.cream}><boxGeometry args={[w, 0.9, 0.6]} /></mesh>
        <mesh position={[0, 0.92, 0]} material={M.marble}><boxGeometry args={[w + 0.1, 0.04, 0.66]} /></mesh>
        <mesh position={[0, 0.07, 0.31]} material={M.marun}><boxGeometry args={[w, 0.14, 0.02]} /></mesh>
        <mesh position={[0, 1.75, -0.2]} material={M.wood}><boxGeometry args={[3.2, 0.05, 0.28]} /></mesh>
        {[-1.2, -0.8, -0.4, 0, 0.4].map((x) => (
          <mesh key={x} position={[x, 1.84, -0.2]}><cylinderGeometry args={[0.05, 0.035, 0.12, 10]} /><meshLambertMaterial color="#F3F1EA" /></mesh>
        ))}
        {[0.9, 1.25].map((x) => (
          <mesh key={x} position={[x, 1.86, -0.2]}><cylinderGeometry args={[0.08, 0.08, 0.16, 12]} /><meshLambertMaterial color="#4A2C1A" /></mesh>
        ))}
        <mesh position={[0, 1.2, 0.0]} material={M.gold}><boxGeometry args={[0.001, 0.001, 0.001]} /></mesh>
      </group>

      <Html position={[cx, 2.3, zC]} center pointerEvents="none"><div className="zonetag">BAR KOPI</div></Html>
    </>
  );
}