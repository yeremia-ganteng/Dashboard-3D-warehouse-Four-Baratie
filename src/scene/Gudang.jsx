import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore.js';
import { M } from '../objects/materials.js';
import { GUDANG as G } from './layout.js';
import { gudangStock } from './serving.js';

// Gudang Outlet: bangunan kecil di sebelah kanan dok bongkar. Dinding kaca pendek, pintu di sisi trotoar (selatan),
// atap mengikuti mode atap (store.roof). Peti dari pengiriman terakhir tampak di atas palet. Murni primitif, tanpa cahaya titik.
const cx = (G.x0 + G.x1) / 2, cz = (G.z0 + G.z1) / 2, W = G.x1 - G.x0, D = G.z1 - G.z0;
const d0 = G.doorX - G.doorW / 2, d1 = G.doorX + G.doorW / 2;
const CRATE_X = [G.inX - 0.45, G.inX, G.inX + 0.45];
const CRATE_Z = 6.15;

// Dinding kaca pendek: dasar krem + kaca + balok atas marun. Sumbu lokal x = panjang dinding.
function Wall({ pos, len, rotY = 0 }) {
  const gh = G.h - 0.6;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.3, 0]} material={M.cream}><boxGeometry args={[len, 0.6, 0.08]} /></mesh>
      <mesh position={[0, 0.61, 0]} material={M.gold}><boxGeometry args={[len, 0.02, 0.1]} /></mesh>
      <mesh position={[0, 0.6 + gh / 2, 0]} material={M.glass} raycast={() => null}><boxGeometry args={[len, gh, 0.03]} /></mesh>
      <mesh position={[0, G.h, 0]} material={M.marun}><boxGeometry args={[len, 0.07, 0.1]} /></mesh>
    </group>
  );
}

// Atap: transparan (ghost) / solid / sembunyi, sama dengan atap bangunan lain
function GRoof() {
  const mode = useStore((s) => s.roof);
  if (mode === 'off') return null;
  const ghost = mode !== 'solid';
  const rw = W + 0.34, rd = D + 0.34;
  const mat = (c) => <meshLambertMaterial color={c} transparent={ghost} opacity={ghost ? 0.22 : 1} depthWrite={!ghost} />;
  return (
    <group position={[cx, G.h + 0.1, cz]}>
      <mesh><boxGeometry args={[rw, 0.12, rd]} />{mat('#F3E9DA')}</mesh>
      <mesh position={[0, 0.02, rd / 2]}><boxGeometry args={[rw + 0.06, 0.26, 0.08]} />{mat('#6B1F23')}</mesh>
      <mesh position={[0, 0.02, -rd / 2]}><boxGeometry args={[rw + 0.06, 0.26, 0.08]} />{mat('#6B1F23')}</mesh>
      <mesh position={[rw / 2, 0.02, 0]}><boxGeometry args={[0.08, 0.26, rd]} />{mat('#6B1F23')}</mesh>
      <mesh position={[-rw / 2, 0.02, 0]}><boxGeometry args={[0.08, 0.26, rd]} />{mat('#6B1F23')}</mesh>
      <mesh position={[0, 0.07, rd / 2 + 0.045]}><boxGeometry args={[rw, 0.03, 0.01]} />{mat('#B07A3A')}</mesh>
    </group>
  );
}

export default function Gudang() {
  const grp = useRef([]), mats = useRef([]), sig = useRef('');
    const stash = useStore((s) => s.stash);
  const bread = Math.round(stash.filter((t) => t.src === 'produksi').reduce((a, t) => a + t.qty, 0));
  const sup = stash.filter((t) => t.src !== 'produksi').length;
  const label = ['GUDANG', bread > 0 && `${bread} roti`, sup > 0 && `${sup} bahan`].filter(Boolean).join(' · ');
  useFrame(() => {
    const cols = gudangStock.cols, s = cols.join(',');
    if (s === sig.current) return;
    sig.current = s;
    CRATE_X.forEach((_, i) => {
      const g = grp.current[i];
      if (!g) return;
      g.visible = i < cols.length;
      if (i < cols.length) mats.current[i]?.color.set(cols[i]);
    });
  });

  return (
    <group>
      {/* lantai */}
      <mesh position={[cx, 0.005, cz]}><boxGeometry args={[W, 0.01, D]} /><meshLambertMaterial color="#D9CFBF" /></mesh>

      {/* dinding: utara, barat, timur, dan selatan (dua segmen + pintu) */}
      <Wall pos={[cx, 0, G.z0]} len={W} />
      <Wall pos={[G.x0, 0, cz]} len={D} rotY={Math.PI / 2} />
      <Wall pos={[G.x1, 0, cz]} len={D} rotY={Math.PI / 2} />
      <Wall pos={[(G.x0 + d0) / 2, 0, G.z1]} len={d0 - G.x0} />
      <Wall pos={[(d1 + G.x1) / 2, 0, G.z1]} len={G.x1 - d1} />

      {/* tiang sudut + kusen pintu + penutup atas pintu + ambang emas */}
      {[[G.x0, G.z0], [G.x1, G.z0], [G.x0, G.z1], [G.x1, G.z1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, G.h / 2, z]} material={M.marun}><boxGeometry args={[0.1, G.h, 0.1]} /></mesh>
      ))}
      {[d0, d1].map((x) => <mesh key={x} position={[x, G.h / 2, G.z1]} material={M.marun}><boxGeometry args={[0.08, G.h, 0.1]} /></mesh>)}
      <mesh position={[G.doorX, 2.15, G.z1]} material={M.cream}><boxGeometry args={[G.doorW + 0.08, G.h - 2.0, 0.1]} /></mesh>
      <mesh position={[G.doorX, 0.012, G.z1]} material={M.gold}><boxGeometry args={[G.doorW, 0.014, 0.2]} /></mesh>

      {/* rak besi di dinding utara + kardus di atasnya */}
      <group position={[G.inX, 0, G.z0 + 0.24]}>
        {[[-0.8, -0.15], [0.8, -0.15], [-0.8, 0.15], [0.8, 0.15]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.7, z]} material={M.dark}><boxGeometry args={[0.04, 1.4, 0.04]} /></mesh>
        ))}
        {[0.5, 1.0, 1.4].map((y) => <mesh key={y} position={[0, y, 0]} material={M.steel}><boxGeometry args={[1.64, 0.03, 0.34]} /></mesh>)}
        {[[-0.5, 0.5], [0.05, 0.5], [0.5, 0.5], [-0.35, 1.0], [0.3, 1.0]].map(([x, y]) => (
          <group key={`${x}${y}`} position={[x, y + 0.13, 0]}>
            <mesh material={M.wood}><boxGeometry args={[0.36, 0.22, 0.28]} /></mesh>
            <mesh position={[0, 0, 0.142]} material={M.gold}><boxGeometry args={[0.12, 0.04, 0.004]} /></mesh>
          </group>
        ))}
      </group>

      {/* palet + peti (warna mengikuti pengiriman terakhir) */}
      <mesh position={[G.inX, 0.03, CRATE_Z]} material={M.wood}><boxGeometry args={[1.5, 0.04, 0.5]} /></mesh>
      {CRATE_X.map((x, i) => (
        <group key={x} ref={(el) => { grp.current[i] = el; }} position={[x, 0.15, CRATE_Z]} visible={false}>
          <mesh><boxGeometry args={[0.38, 0.2, 0.3]} /><meshLambertMaterial ref={(m) => { mats.current[i] = m; }} color="#D9A441" /></mesh>
          <mesh position={[0, 0.1, 0]} material={M.cream}><boxGeometry args={[0.4, 0.02, 0.32]} /></mesh>
          <mesh position={[0, 0, 0.151]} material={M.gold}><boxGeometry args={[0.12, 0.05, 0.004]} /></mesh>
        </group>
      ))}

      {/* kardus penyimpanan di sudut barat daya (di luar jalur pintu) */}
      <mesh position={[G.x0 + 0.25, 0.22, 7.1]} material={M.wood}><boxGeometry args={[0.4, 0.44, 0.4]} /></mesh>
      <mesh position={[G.x0 + 0.25, 0.22, 7.302]} material={M.gold}><boxGeometry args={[0.14, 0.05, 0.004]} /></mesh>

      <GRoof />
      <Html position={[G.doorX, G.h + 0.4, G.z1]} center pointerEvents="none"><div className="zonetag">{label}</div></Html>
    </group>
  );
}