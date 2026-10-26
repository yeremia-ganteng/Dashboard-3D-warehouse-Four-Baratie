import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { M } from './materials.js';
import { drawSign } from './textures.js';
import { itemMap, products } from '../store/useStore.js';
import { rupiah } from '../store/helpers.js';

const GLASS = new THREE.MeshLambertMaterial({ color: '#DCEFF2', transparent: true, opacity: 0.35, depthWrite: false });

// Helper kecil: balok & silinder (material bersama `m` atau warna `c`)
const B = ({ p, s, m, c, r }) => (
  <mesh position={p} rotation={r} {...(m ? { material: m } : {})}>
    <boxGeometry args={s} />{c && <meshLambertMaterial color={c} />}
  </mesh>
);
const C = ({ p, a, m, c, r, seg = 14 }) => (
  <mesh position={p} rotation={r} {...(m ? { material: m } : {})}>
    <cylinderGeometry args={[a[0], a[1], a[2], seg]} />{c && <meshLambertMaterial color={c} />}
  </mesh>
);

// Tekstur kanvas (papan nama & menu). Digambar ulang setelah font siap.
function useCanvasTex(w, h, draw) {
  const invalidate = useThree((s) => s.invalidate);
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [w, h]);
  useEffect(() => {
    const redraw = () => { draw(tex.image); tex.needsUpdate = true; invalidate(); };
    redraw();
    document.fonts?.load('600 40px "Playfair Display"').then(redraw).catch(() => {});
  }, [tex, invalidate]); // eslint-disable-line
  return tex;
}

function Sign() {
  const tex = useCanvasTex(512, 512, drawSign);
  return (
    <group position={[8, 2.75, -3.94]}>
      <mesh><circleGeometry args={[0.62, 48]} /><meshBasicMaterial map={tex} /></mesh>
      <mesh position={[0, 0, 0.003]} material={M.gold}><ringGeometry args={[0.62, 0.66, 48]} /></mesh>
    </group>
  );
}

// Papan menu: harga diambil dari data (referensi), bukan angka karangan
function drawMenu(c) {
  const g = c.getContext('2d'), W = c.width, H = c.height;
  const drink = products.find((p) => p.id === 'minuman-dingin')?.price ?? 0;
  const rows = [
    ['Banana Cake', rupiah(itemMap['banana-cake'].price)],
    ['Roti Boy · Sosis · Coffee Bun', rupiah(itemMap['roti-sosis'].price)],
    ['Minuman Dingin', rupiah(drink)],
  ];
  g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#B07A3A'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
  g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillStyle = '#B07A3A'; g.font = '600 50px "Playfair Display", Georgia, serif'; g.fillText('MENU', W / 2, 64);
  g.font = '500 30px Inter, system-ui, sans-serif';
  rows.forEach(([name, price], i) => {
    const y = 138 + i * 60;
    g.textAlign = 'left'; g.fillStyle = '#F8F1E7'; g.fillText(name, 46, y);
    g.textAlign = 'right'; g.fillStyle = '#B07A3A'; g.fillText(price, W - 46, y);
  });
  g.textAlign = 'center'; g.fillStyle = '#9A9288'; g.font = '400 20px Inter, system-ui, sans-serif';
  g.fillText('Harga referensi · DATA DEMO', W / 2, H - 36);
}
function MenuBoard() {
  const tex = useCanvasTex(768, 340, drawMenu);
  return (
    <group position={[2.9, 3.0, -3.94]}>
      <B p={[0, 0, -0.01]} s={[1.98, 0.9, 0.03]} m={M.gold} />
      <mesh position={[0, 0, 0.012]}><planeGeometry args={[1.9, 0.84]} /><meshBasicMaterial map={tex} /></mesh>
    </group>
  );
}

// Mesin kasir (POS): laci kas, keypad, layar menghadap kasir (+z), printer struk
function Register({ x = -1.6 }) {
  return (
    <group position={[x, 1.08, 0.08]}>
      <B p={[0, 0.05, 0]} s={[0.46, 0.1, 0.36]} m={M.ink} />
      <B p={[0, 0.115, 0.1]} s={[0.4, 0.03, 0.14]} m={M.dark} />
      {[-0.12, -0.04, 0.04, 0.12].map((x) => <B key={x} p={[x, 0.134, 0.1]} s={[0.05, 0.008, 0.04]} c="#D9D2C3" />)}
      <C p={[0, 0.2, -0.06]} a={[0.025, 0.03, 0.12]} m={M.dark} seg={8} />
      <group position={[0, 0.3, -0.06]} rotation={[-0.3, 0, 0]}>
        <B p={[0, 0, 0]} s={[0.36, 0.24, 0.03]} m={M.ink} />
        <mesh position={[0, 0, 0.017]}><planeGeometry args={[0.32, 0.2]} /><meshBasicMaterial color="#CFE6D6" /></mesh>
        {[0.06, 0.02, -0.02].map((y, i) => (
          <mesh key={y} position={[-0.05 + i * 0.01, y, 0.019]}><planeGeometry args={[0.2 - i * 0.04, 0.014]} /><meshBasicMaterial color="#4F6D58" /></mesh>
        ))}
      </group>
      <B p={[0.3, 0.06, -0.02]} s={[0.14, 0.12, 0.14]} m={M.dark} />
      <B p={[0.3, 0.14, -0.02]} s={[0.07, 0.07, 0.004]} c="#FFFFFF" />
    </group>
  );
}

// Mesin espresso 2 group head + grinder + cup
export function Espresso() {
  return (
    <group position={[1.4, 1.08, 0]}>
      <B p={[0, 0.02, 0]} s={[0.9, 0.04, 0.48]} m={M.dark} />
      <B p={[0, 0.22, -0.01]} s={[0.86, 0.36, 0.44]} m={M.steel} />
      <B p={[0, 0.42, -0.01]} s={[0.88, 0.03, 0.46]} m={M.steel} />
      <B p={[0, 0.34, 0.226]} s={[0.86, 0.1, 0.012]} m={M.marun} />
      <B p={[0, 0.1, 0.226]} s={[0.86, 0.02, 0.012]} m={M.gold} />
      {[-0.3, -0.1, 0.1, 0.3].map((x) => <mesh key={x} position={[x, 0.34, 0.236]}><sphereGeometry args={[0.018, 8, 6]} /><meshLambertMaterial color="#F3E9DA" /></mesh>)}
      {[-1, 1].map((d) => (
        <group key={d}>
          <C p={[d * 0.17, 0.2, 0.2]} a={[0.045, 0.045, 0.06]} m={M.dark} />
          <C p={[d * 0.17, 0.165, 0.22]} a={[0.04, 0.036, 0.03]} m={M.ink} />
          <B p={[d * 0.17, 0.165, 0.33]} s={[0.025, 0.02, 0.16]} m={M.ink} />
          <C p={[d * 0.17, 0.085, 0.24]} a={[0.036, 0.028, 0.045]} c="#F8F5EE" />
        </group>
      ))}
      <B p={[0, 0.038, 0.31]} s={[0.7, 0.012, 0.2]} m={M.steel} />
      <C p={[0, 0.3, 0.228]} a={[0.032, 0.032, 0.012]} r={[Math.PI / 2, 0, 0]} m={M.gold} />
      <C p={[0, 0.3, 0.236]} a={[0.025, 0.025, 0.006]} r={[Math.PI / 2, 0, 0]} c="#F8F5EE" />
      <C p={[0.4, 0.22, 0.2]} a={[0.008, 0.008, 0.24]} m={M.steel} seg={6} />
      <C p={[0.4, 0.1, 0.2]} a={[0.014, 0.01, 0.03]} m={M.ink} seg={6} />
      {[-0.28, -0.2, -0.12].map((x) => <C key={x} p={[x, 0.46, 0]} a={[0.04, 0.03, 0.05]} c="#F8F5EE" />)}
      {/* grinder */}
      <group position={[-0.95, 0, 0.0]}>
        <B p={[0, 0.17, 0]} s={[0.2, 0.34, 0.22]} m={M.ink} />
        <C p={[0, 0.44, 0]} a={[0.1, 0.06, 0.2]} m={GLASS} />
        <C p={[0, 0.41, 0]} a={[0.085, 0.056, 0.14]} c="#3A2112" />
        <C p={[0, 0.56, 0]} a={[0.07, 0.1, 0.03]} m={M.ink} />
        <B p={[0, 0.12, 0.13]} s={[0.04, 0.05, 0.06]} m={M.dark} />
      </group>
    </group>
  );
}

// Dekor kecil: cup takeaway + tutup, tip jar, standee QRIS, mesin EDC
function Extras() {
  return (
    <group position={[0, 1.08, 0]}>
      {[0, 0.045, 0.09].map((y, i) => <C key={y} p={[-0.55, 0.07 + y, 0.1]} a={[0.052 - i * 0.001, 0.036, 0.14]} c="#F3F1EA" />)}
      <C p={[-0.55, 0.0, 0.1]} a={[0.001, 0.001, 0.001]} c="#F3F1EA" />
      {[0, 1, 2].map((i) => <C key={i} p={[-0.78, 0.015 + i * 0.012, 0.1]} a={[0.052, 0.052, 0.01]} c="#6B1F23" />)}
      <C p={[-2.1, 0.08, 0.2]} a={[0.08, 0.08, 0.16]} m={GLASS} />
      <C p={[-2.1, 0.045, 0.2]} a={[0.07, 0.07, 0.07]} c="#7BA05B" />
      <C p={[-2.1, 0.17, 0.2]} a={[0.085, 0.085, 0.02]} m={M.marun} />
      <group position={[-1.05, 0, 0.25]} rotation={[-0.12, 0, 0]}>
        <B p={[0, 0.005, 0]} s={[0.1, 0.01, 0.08]} m={M.dark} />
        <B p={[0, 0.11, 0]} s={[0.14, 0.2, 0.015]} c="#FFFFFF" />
        <B p={[0, 0.19, 0.009]} s={[0.14, 0.04, 0.004]} m={M.marun} />
        <B p={[0, 0.1, 0.01]} s={[0.09, 0.09, 0.004]} m={M.ink} />
        {[[-0.025, 0.125], [0.025, 0.075], [0.025, 0.125], [-0.025, 0.075]].map(([x, y]) => <B key={`${x}${y}`} p={[x, y, 0.013]} s={[0.025, 0.025, 0.003]} c="#FFFFFF" />)}
      </group>
      <group position={[-1.28, 0, 0.22]} rotation={[0.25, 0, 0]}>
        <B p={[0, 0.03, 0]} s={[0.1, 0.035, 0.17]} m={M.ink} />
        <B p={[0, 0.05, 0.03]} s={[0.07, 0.003, 0.05]} c="#CFE6D6" />
      </group>
    </group>
  );
}

// Papan kecil penanda stasiun kasir (berdiri di tepi depan konter)
function drawPlate(c, text) {
  const g = c.getContext('2d'), W = c.width, H = c.height;
  g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#B07A3A'; g.lineWidth = 5; g.strokeRect(8, 8, W - 16, H - 16);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#F8F1E7'; g.font = '600 34px Inter, system-ui, sans-serif';
  g.fillText(text, W / 2, H / 2 + 2);
}
function StationSign({ x, text }) {
  const tex = useCanvasTex(512, 128, (c) => drawPlate(c, text));
  return (
    <group position={[x, 1.08, 0.42]} rotation={[-0.25, 0, 0]}>
      <B p={[0, 0.005, -0.02]} s={[0.3, 0.01, 0.08]} m={M.dark} />
      <B p={[0, 0.07, 0]} s={[0.52, 0.135, 0.015]} m={M.gold} />
      <mesh position={[0, 0.07, 0.009]}><planeGeometry args={[0.5, 0.125]} /><meshBasicMaterial map={tex} /></mesh>
    </group>
  );
}

// Etalase mini di ujung kanan konter (dulu tempat mesin kopi): kaca berbingkai marun berisi roti mini
function MiniCase({ x }) {
  return (
    <group position={[x, 1.08, 0.02]}>
      <B p={[0, 0.02, 0]} s={[0.58, 0.04, 0.42]} m={M.marun} />
      <B p={[0, 0.043, 0]} s={[0.6, 0.006, 0.44]} m={M.gold} />
      <B p={[0, 0.052, 0]} s={[0.48, 0.012, 0.32]} m={M.cream} />
      {[[-0.14, 0.04, '#D9A66B'], [0, -0.05, '#8A5A36'], [0.14, 0.04, '#E3B572']].map(([px, pz, c]) => (
        <mesh key={px} position={[px, 0.1, pz]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.055, 12, 8]} /><meshLambertMaterial color={c} /></mesh>
      ))}
      <mesh position={[0, 0.215, 0]} material={GLASS}><boxGeometry args={[0.52, 0.34, 0.36]} /></mesh>
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => (
        <B key={`${a}${b}`} p={[a * 0.265, 0.215, b * 0.185]} s={[0.025, 0.34, 0.025]} m={M.marun} />
      ))}
      <B p={[0, 0.395, 0]} s={[0.58, 0.03, 0.42]} m={M.marun} />
      <C p={[0, 0.425, 0]} a={[0.02, 0.02, 0.03]} m={M.gold} seg={8} />
    </group>
  );
}

export default function Counter() {
  return (
    <>
      <group position={[5, 0, -2.2]}>
        <mesh position={[0, 0.5, 0]} material={M.cream}><boxGeometry args={[4.6, 1, 0.9]} /></mesh>
        <mesh position={[0, 0.07, 0.46]} material={M.marun}><boxGeometry args={[4.6, 0.14, 0.02]} /></mesh>
        <mesh position={[0, 0.8, 0.46]} material={M.gold}><boxGeometry args={[4.6, 0.02, 0.02]} /></mesh>
        <mesh position={[0, 1.04, 0.02]} material={M.marble}><boxGeometry args={[4.9, 0.08, 1.05]} /></mesh>
        <Register x={-1.6} />
        <Register x={1.4} />
        <StationSign x={-1.6} text="KASIR 1" />
        <StationSign x={1.4} text="KASIR 2" />
        <MiniCase x={2.12} />
        <PayDesk x={0.62} />
        <Extras />
      </group>
      <Sign />
      <MenuBoard />
    </>
  );

  // Standee QRIS + mesin EDC untuk Kasir 2 (Kasir 1 sudah punya di Extras)
function PayDesk({ x }) {
  return (
    <group position={[x, 1.08, 0]}>
      <group position={[0, 0, 0.25]} rotation={[-0.12, 0, 0]}>
        <B p={[0, 0.005, 0]} s={[0.1, 0.01, 0.08]} m={M.dark} />
        <B p={[0, 0.11, 0]} s={[0.14, 0.2, 0.015]} c="#FFFFFF" />
        <B p={[0, 0.19, 0.009]} s={[0.14, 0.04, 0.004]} m={M.marun} />
        <B p={[0, 0.1, 0.01]} s={[0.09, 0.09, 0.004]} m={M.ink} />
        {[[-0.025, 0.125], [0.025, 0.075], [0.025, 0.125], [-0.025, 0.075]].map(([px, py]) => (
          <B key={`${px}${py}`} p={[px, py, 0.013]} s={[0.025, 0.025, 0.003]} c="#FFFFFF" />
        ))}
      </group>
      <group position={[0.25, 0, 0.22]} rotation={[0.25, 0, 0]}>
        <B p={[0, 0.03, 0]} s={[0.1, 0.035, 0.17]} m={M.ink} />
        <B p={[0, 0.05, 0.03]} s={[0.07, 0.003, 0.05]} c="#CFE6D6" />
      </group>
    </group>
  );
}
}