import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { M } from './materials.js';
import { oven } from '../scene/serving.js';
import { WORK } from '../scene/layout.js';

// Bar progres panggang di atas oven (koordinat lokal grup Oven). Data dari scene/Workers.jsx lewat serving.js -> oven.
// Bar = 3D (ringan); label teks = satu elemen HTML yang teksnya diperbarui hanya saat berubah.
const W = 1.5, Y = 2.05, Z = 0.6;

export default function OvenProgress() {
  const grp = useRef(), fill = useRef(), mat = useRef(), txt = useRef();
  const shown = useRef({ name: '', sec: -1, color: '' });
  const [show, setShow] = useState(false);

  useFrame(() => {
    if (show !== oven.on) setShow(oven.on);
    const g = grp.current;
    if (!g) return;
    if (g.visible !== oven.on) g.visible = oven.on;
    if (!oven.on) return;
    fill.current.scale.x = Math.max(0.001, oven.p);
    const sh = shown.current;
    if (sh.color !== oven.color) { sh.color = oven.color; mat.current.color.set(oven.color); }
    const sec = Math.max(0, Math.ceil((1 - oven.p) * WORK.bakeTime));
    if (txt.current && (sh.name !== oven.name || sh.sec !== sec)) {
      sh.name = oven.name; sh.sec = sec;
      txt.current.textContent = `Memanggang ${oven.name} · ${sec} dtk`;
    }
  });

  return (
    <>
      <group ref={grp} position={[0, Y, Z]} visible={false}>
        <mesh material={M.ink} raycast={() => null}><boxGeometry args={[W + 0.08, 0.1, 0.07]} /></mesh>
        <mesh position={[0, 0.056, 0]} material={M.gold} raycast={() => null}><boxGeometry args={[W + 0.08, 0.012, 0.075]} /></mesh>
        <group ref={fill} position={[-W / 2, 0, 0.02]} scale={[0.001, 1, 1]}>
          <mesh position={[W / 2, 0, 0]} raycast={() => null}>
            <boxGeometry args={[W, 0.06, 0.05]} />
            <meshLambertMaterial ref={mat} color="#D9A66B" />
          </mesh>
        </group>
      </group>
      {show && (
        <Html position={[0, Y + 0.24, Z]} center pointerEvents="none" zIndexRange={[12, 0]}>
          <div ref={txt} className="zonetag" aria-hidden="true">Memanggang…</div>
        </Html>
      )}
    </>
  );
}