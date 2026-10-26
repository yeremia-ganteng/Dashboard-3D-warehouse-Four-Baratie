import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SITE } from './layout.js';
import { M } from '../objects/materials.js';

const { road, padProdX, padOutX } = SITE;
const X0 = road.x0, X1 = road.x1;
const LEN = X1 - X0, CX = (X0 + X1) / 2;
const ROAD_W = road.z1 - road.z0, ROAD_CZ = (road.z0 + road.z1) / 2;

const L = (color) => new THREE.MeshLambertMaterial({ color });
const MAT = { ground: L('#EFE5D3'), asphalt: L('#3D3B3C'), walk: L('#E6DCC9'), paver: L('#EADFCB'), concrete: L('#CFC7B6'), lawn: L('#69A04B') };

// ---- Data posisi: [x, y, z, sx, sy, sz] (opsional: rx, ry, rz, warna) ----
const ZX = (padProdX + padOutX) / 2; // zebra cross di tengah antara kedua dok
const WHITE = []; // marka putih: garis putus-putus tengah + zebra cross
for (let x = X0 + 1; x < X1 - 1.5; x += 2.6) WHITE.push([x + 0.6, 0.012, road.mid, 1.2, 0.012, 0.1]);
for (let k = 0; k < 7; k++) WHITE.push([ZX, 0.012, road.z0 + 0.4 + k * 0.55, 2.4, 0.012, 0.28]);
const EDGES = [[CX, 0.012, road.z0 + 0.2, LEN - 1, 0.012, 0.05], [CX, 0.012, road.z1 - 0.2, LEN - 1, 0.012, 0.05]];

// Halaman Outlet (paving x 1.2..13.8, z 4..8.2): garis sambungan paving
const JOINTS = [];
for (let x = 2.6; x < 15.2; x += 1.4) JOINTS.push([x, 0.004, 6.1, 0.03, 0.008, 4.2]);
for (let z = 5.05; z < 8.2; z += 1.05) JOINTS.push([8.2, 0.004, z, 14.4, 0.008, 0.03]);
// Pot tanaman di tepi depan halaman. Celah x ≈ 11.2..12.6 = pintu masuk pelanggan
const PLANT_X = [1.6, 3.1, 4.6, 6.1, 7.6, 9.1, 10.6, 13.2, 14.7];
const PLANTERS = PLANT_X.map((x) => [x, 0.17, 8.0, 1.2, 0.34, 0.45]);
const SOIL = PLANT_X.map((x) => [x, 0.345, 8.0, 1.1, 0.02, 0.36]); // tanah gelap di permukaan pot

// Tanaman di pot: daun panjang melengkung (satu geometri pita, dipakai ulang lewat InstancedMesh).
// Warna: gelap di pangkal -> terang di ujung (vertex color) x warna per daun (instance color).
// Acak dengan seed tetap -> tampilannya sama setiap reload.
const TAU = Math.PI * 2;
const rng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Satu helai daun: panjang 1, setengah lebar maks 1, melengkung ke +z. Diatur lewat skala instance:
// sx = setengah lebar, sy = panjang, sz = jangkauan lengkung ke samping
function makeBlade() {
  const N = 7, pos = [], col = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const w = Math.sin(Math.PI * (0.12 + 0.88 * t)); // lebar: menyempit ke ujung runcing
    const y = t * (1 - 0.3 * t), z = 0.3 * t + 0.7 * t * t; // naik lalu melengkung
    const s = 0.5 + 0.5 * t; // pangkal lebih gelap
    pos.push(-w, y, z, w, y, z);
    col.push(s, s, s, s, s, s);
    if (i < N) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const BLADE = makeBlade();
const LEAF_DARK = ['#2E5428', '#3A6330', '#46733A', '#55843F', '#66964A'];
const LEAF_LIGHT = ['#6F9F4B', '#7DAA55', '#93BC62', '#A5C971'];
function buildFoliage() {
  const r = rng(11), choose = (a) => a[Math.floor(r() * a.length)];
  const leaves = [];
  PLANT_X.forEach((x) => {
    // daun besar: tinggi di tengah pot, menyebar keluar
    for (let i = 0; i < 44; i++) {
      const dx = (r() - 0.5) * 1.0, dz = (r() - 0.5) * 0.28;
      const yaw = r() < 0.65 ? Math.atan2(dx, dz * 3) + (r() - 0.5) * 1.2 : r() * TAU;
      const len = (0.5 + r() * 0.45) * (1.15 - 0.5 * Math.abs(dx));
      leaves.push([x + dx, 0.33, 8.0 + dz, 0.035 + r() * 0.03, len, 0.12 + r() * 0.32, 0, yaw, 0, choose(r() < 0.8 ? LEAF_DARK : LEAF_LIGHT)]);
    }
    // rumput pendek pengisi (lebih terang)
    for (let i = 0; i < 20; i++) {
      const dx = (r() - 0.5) * 1.04, dz = (r() - 0.5) * 0.34;
      leaves.push([x + dx, 0.33, 8.0 + dz, 0.02 + r() * 0.012, 0.18 + r() * 0.17, 0.05 + r() * 0.1, 0, r() * TAU, 0, choose(LEAF_LIGHT)]);
    }
  });
  return leaves;
}
const LEAVES = buildFoliage();

const LAMP_X = [];
for (let x = X0 + 4; x < X1 - 1; x += 8) LAMP_X.push(x);
const POLES = LAMP_X.map((x) => [x, 1.56, 14.2, 1, 1, 1]);
const ARMS = LAMP_X.map((x) => [x, 3.04, 13.8, 1, 1, 1]);
const HEADS = LAMP_X.map((x) => [x, 2.98, 13.4, 1, 1, 1]);
const POOLS = LAMP_X.map((x) => [x, 0.016, 12.8, 1, 1, 1]);

// ---- Pohon, semak, dan hamparan rumput (di belakang trotoar belakang) ----
const SHOW_LAWN = true;    // false = tanpa hamparan rumput (pohon tetap ada, berdiri di alas krem)
const TREE_SCALE = 1.0;    // ubah untuk membesarkan / mengecilkan semua pohon
const LAWN_Y = -0.11;      // permukaan rumput (alas "pulau" berada di -0.125)
const LAWN_Z0 = 14.8, LAWN_Z1 = 16.95;
const BARK = ['#6B4A2F', '#7A5A3A', '#5E4129'];
const TREE_GREENS = ['#3F7A33', '#4C8B3B', '#5A9A43', '#4A8A3E'];  // gumpalan bawah & samping
const TREE_LIGHT = ['#7DB656', '#8CC463', '#6FAE4D'];              // gumpalan puncak
const LAWN_BLADES = ['#4C8B3B', '#5A9A43', '#6FAE4D', '#82BE5A', '#93BC62'];

// Gumpalan daun: ikosahedron yang sedikit diacak + warna vertex gelap (bawah) -> terang (atas).
// Geometri ini tidak ber-indeks, jadi normalnya per-sisi (tampak bersisi tegas, tidak buram).
// Pengacakan memakai hash posisi supaya titik kembar di sisi berbeda bergeser sama (tidak ada celah).
function makeFoliage() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), v = new THREE.Vector3();
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, i);
    const h = hash(Math.round(v.x * 100), Math.round(v.y * 100), Math.round(v.z * 100));
    const shade = 0.58 + 0.42 * Math.min(1, Math.max(0, (v.y + 1) / 2));
    v.multiplyScalar(0.84 + 0.3 * h);
    p.setXYZ(i, v.x, v.y, v.z);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = shade;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
const FOLIAGE = makeFoliage();

function buildTrees() {
  const r = rng(31), choose = (a) => a[Math.floor(r() * a.length)];
  const trunks = [], crowns = [], patches = [], grass = [];
  const blob = (x, y, z, rr, color, flat = 0.86) => crowns.push([x, y, z, rr, rr * flat, rr, r() * 3, r() * TAU, r() * 3, color]);
  for (let x = X0 + 2; x < X1; x += 4.6) {
    const s = (0.9 + r() * 0.3) * TREE_SCALE;
    const tx = x + (r() - 0.5) * 0.5, tz = 15.6 + (r() - 0.5) * 0.5;
    const th = 1.15 * s; // tinggi batang
    trunks.push([tx, LAWN_Y + th / 2, tz, s, th, s, (r() - 0.5) * 0.08, 0, (r() - 0.5) * 0.08, choose(BARK)]);
    // tajuk: inti besar + 5 gumpalan di sekelilingnya + puncak yang lebih terang
    const cy = LAWN_Y + th + 0.25 * s;
    blob(tx, cy + 0.1 * s, tz, 0.72 * s, choose(TREE_GREENS), 0.88);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + r() * 0.6, d = (0.42 + r() * 0.18) * s;
      blob(tx + Math.cos(a) * d, cy + (r() - 0.3) * 0.35 * s, tz + Math.sin(a) * d, (0.46 + r() * 0.14) * s, choose(TREE_GREENS));
    }
    blob(tx + (r() - 0.5) * 0.2, cy + 0.62 * s, tz + (r() - 0.5) * 0.2, 0.46 * s, choose(TREE_LIGHT), 0.9);
    // bercak rumput gelap di bawah pohon + helai rumput runcing di sekitar pangkal
    patches.push([tx, LAWN_Y + 0.012, tz, 1.15 * s, 1.15 * s, 1]);
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = 0.25 + r() * 0.75;
      grass.push([tx + Math.cos(a) * d, LAWN_Y, tz + Math.sin(a) * d, 0.02 + r() * 0.015, 0.14 + r() * 0.16, 0.04 + r() * 0.1, 0, r() * TAU, 0, choose(LAWN_BLADES)]);
    }
    // semak kecil di antara pohon
    const bx = tx + 2.3 + (r() - 0.5) * 0.4;
    if (bx < X1 + 2) {
      const rr = 0.3 + r() * 0.12, bz = 16.2 + r() * 0.4;
      crowns.push([bx, LAWN_Y + rr * 0.55, bz, rr * 1.15, rr * 0.8, rr, r() * 3, r() * TAU, r() * 3, choose(TREE_GREENS)]);
    }
  }
  // rumput tersebar di hamparan
  for (let i = 0; i < 150; i++) {
    grass.push([X0 - 2 + r() * (LEN + 4), LAWN_Y, LAWN_Z0 + 0.15 + r() * (LAWN_Z1 - LAWN_Z0 - 0.3), 0.02 + r() * 0.015, 0.1 + r() * 0.12, 0.03 + r() * 0.08, 0, r() * TAU, 0, choose(LAWN_BLADES)]);
  }
  return { trunks, crowns, patches, grass };
}
const { trunks: TRUNKS, crowns: CROWNS, patches: PATCHES, grass: GRASS } = buildTrees();

// Satu InstancedMesh untuk banyak objek serupa (hemat draw call di HP).
// Item boleh membawa rotasi (rx, ry, rz) dan warna per item; item 6-angka lama tetap memakai rotX.
function Inst({ items, rotX = 0, children }) {
  const ref = useRef();
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, 0, 0));
    const q2 = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach(([x, y, z, sx, sy, sz, rx, ry, rz, color], i) => {
      m.compose(p.set(x, y, z), rx === undefined ? q : q2.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz));
      ref.current.setMatrixAt(i, m);
      if (color) ref.current.setColorAt(i, c.set(color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    invalidate();
  }, [items, rotX, invalidate]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      {children}
    </instancedMesh>
  );
}

// Troli dorong (dekor dok)
function HandTruck({ position }) {
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 0.45, 0]} material={M.ink}><boxGeometry args={[0.03, 0.9, 0.03]} /></mesh>)}
      <mesh position={[0, 0.6, 0]} material={M.ink}><boxGeometry args={[0.27, 0.025, 0.03]} /></mesh>
      <mesh position={[0, 0.07, 0.13]} material={M.steel}><boxGeometry args={[0.3, 0.025, 0.28]} /></mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.09, -0.03]} rotation={[0, 0, Math.PI / 2]} material={M.ink}><cylinderGeometry args={[0.09, 0.09, 0.05, 12]} /></mesh>
      ))}
    </group>
  );
}

// Dok serah-terima: lantai beton, papan rendah marun, garis emas, bollard, troli
function Dock({ cx, label }) {
  return (
    <group position={[cx, 0, 0]}>
      <mesh position={[0, -0.03, 6.75]} material={MAT.concrete}><boxGeometry args={[3.9, 0.1, 2.9]} /></mesh>
      <mesh position={[0, 0.024, 8.1]} material={M.gold}><boxGeometry args={[3.9, 0.012, 0.06]} /></mesh>
      <mesh position={[0, 0.024, 5.45]} material={M.gold}><boxGeometry args={[3.9, 0.012, 0.06]} /></mesh>
      <mesh position={[0, 0.4, 5.2]} material={M.marun}><boxGeometry args={[3.9, 0.8, 0.12]} /></mesh>
      <mesh position={[0, 0.82, 5.2]} material={M.gold}><boxGeometry args={[3.96, 0.04, 0.16]} /></mesh>
      {[-1.9, 1.9].map((x) => (
        <group key={x} position={[x, 0, 8.1]}>
          <mesh position={[0, 0.25, 0]} material={M.ink}><cylinderGeometry args={[0.07, 0.07, 0.5, 8]} /></mesh>
          <mesh position={[0, 0.4, 0]} material={M.gold}><cylinderGeometry args={[0.073, 0.073, 0.05, 8]} /></mesh>
        </group>
      ))}
      <HandTruck position={[1.4, 0.02, 6.0]} />
      <Html position={[0, 0.55, 5.3]} center pointerEvents="none"><div className="zonetag">{label}</div></Html>
    </group>
  );
}

export default function Site({ night }) {
  return (
    <>
      {/* Alas "pulau" diorama */}
      <mesh position={[CX, -0.375, 5.75]} material={MAT.ground}><boxGeometry args={[LEN + 6, 0.5, 22.5]} /></mesh>
      {/* Aspal + trotoar (trotoar sedikit lebih tinggi = tepi jalan) */}
      <mesh position={[CX, -0.06, ROAD_CZ]} material={MAT.asphalt}><boxGeometry args={[LEN, 0.12, ROAD_W]} /></mesh>
      <mesh position={[CX, 0, 8.8]} material={MAT.walk}><boxGeometry args={[LEN, 0.12, 1.2]} /></mesh>
      <mesh position={[CX, 0, 14.1]} material={MAT.walk}><boxGeometry args={[LEN, 0.12, 1.4]} /></mesh>

      {/* Halaman Outlet: paving, bersih dari kendaraan (meja kursi outdoor ada di World) */}
      <mesh position={[8.2, -0.06, 6.1]} material={MAT.paver}><boxGeometry args={[14.4, 0.12, 4.2]} /></mesh>
      <Inst items={JOINTS}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#D8CBB1" /></Inst>
      <Inst items={PLANTERS}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#6B1F23" /></Inst>
      {/* tanah + tanaman berdaun panjang melengkung (warna bervariasi per daun) */}
      <Inst items={SOIL}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#3B2A1E" /></Inst>
      <Inst items={LEAVES}>
        <primitive object={BLADE} attach="geometry" />
        <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
      </Inst>

      {/* Dok muat (produksi) dan dok bongkar (SAMPING Outlet) */}
      <Dock cx={padProdX} label="DOK MUAT · PRODUKSI" />
      <Dock cx={padOutX} label="DOK BONGKAR · OUTLET" />

      {/* Marka jalan */}
      <Inst items={WHITE}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#F8F1E7" /></Inst>
      <Inst items={EDGES}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#B07A3A" /></Inst>

      {/* Lampu jalan: tiang, lengan, kepala lampu (menyala saat malam) */}
      <Inst items={POLES}><cylinderGeometry args={[0.04, 0.05, 3, 6]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={ARMS}><boxGeometry args={[0.06, 0.06, 0.9]} /><meshLambertMaterial color="#111111" /></Inst>
      <Inst items={HEADS}><boxGeometry args={[0.3, 0.08, 0.2]} /><meshBasicMaterial color={night ? '#FFD38A' : '#D9D2C3'} /></Inst>
      {night && (
        <Inst items={POOLS} rotX={-Math.PI / 2}>
          <circleGeometry args={[1.7, 20]} />
          <meshBasicMaterial color="#FFD38A" transparent opacity={0.16} depthWrite={false} />
        </Inst>
      )}

      {/* Hamparan rumput di belakang trotoar: alas hijau + bercak gelap di bawah pohon + helai rumput */}
      {SHOW_LAWN && (
        <>
          <mesh position={[CX, LAWN_Y - 0.015, (LAWN_Z0 + LAWN_Z1) / 2]} material={MAT.lawn}>
            <boxGeometry args={[LEN + 5.8, 0.03, LAWN_Z1 - LAWN_Z0]} />
          </mesh>
          <Inst items={PATCHES} rotX={-Math.PI / 2}><circleGeometry args={[1, 24]} /><meshLambertMaterial color="#55903D" /></Inst>
          <Inst items={GRASS}>
            <primitive object={BLADE} attach="geometry" />
            <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
          </Inst>
        </>
      )}

      {/* Pohon: batang cokelat + tajuk gumpalan daun bersisi tegas (warna sekeluarga dengan tanaman di pot) + semak */}
      <Inst items={TRUNKS}><cylinderGeometry args={[0.07, 0.12, 1, 7]} /><meshLambertMaterial color="#ffffff" /></Inst>
      <Inst items={CROWNS}>
        <primitive object={FOLIAGE} attach="geometry" />
        <meshLambertMaterial vertexColors />
      </Inst>

      <Html position={[ZX, 0.12, 8.8]} center pointerEvents="none">
        <div className="zonetag">JALUR PENGIRIMAN</div>
      </Html>
    </>
  );
}