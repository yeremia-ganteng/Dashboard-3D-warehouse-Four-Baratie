import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Model produk dari primitif, digabung jadi SATU geometri per bagian (warna lewat vertex color).
// Semua model: alas di y=0, pusat di x=0/z=0. Ukuran dalam satuan scene.
// Tiap model = { parts:[{kind:'solid'|'glass'|'liquid', geo}], fp:[lebar,dalam], scale, maxRows, jitter, level }
//   fp/scale  -> ukuran sel di rak (menentukan berapa kolom/baris muat)
//   level     -> true bila ada 'liquid' (tinggi cairan = sisa stok)
const PI = Math.PI, TAU = Math.PI * 2;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

// Transformasi geometri + warnai (vertex color, linear) -> siap digabung
function P(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2]));
  geo.applyMatrix4(_m);
  const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const join = (list) => { const g = mergeGeometries(list, false); list.forEach((x) => x.dispose()); return g; };
const part = (kind, list) => ({ kind, geo: join(list) });
const model = (parts, o) => ({ parts, level: parts.some((p) => p.kind === 'liquid'), jitter: 0, maxRows: 2, scale: 1, ...o });

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r, ...a) => new THREE.SphereGeometry(r, 16, 10, ...a);
const caps = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10); // sumbu Y
const ring = (R, t) => new THREE.TorusGeometry(R, t, 6, 18);   // bidang XY

/* ---------------- ROTI ---------------- */
const BUN = { R: 0.14, SY: 0.62, CY: 0.09 };
// titik di permukaan topping (theta dalam kelipatan PI dari puncak, phi dalam radian)
const capPt = (th, ph, k = 1.04) => {
  const r = BUN.R * k, a = th * PI;
  return [r * Math.sin(a) * Math.cos(ph), BUN.CY + r * BUN.SY * Math.cos(a), r * Math.sin(a) * Math.sin(ph)];
};
const capRing = (th, tube, color) => {
  const r = BUN.R * 1.04, a = th * PI;
  return P(ring(r * Math.sin(a) + 0.002, tube), color, [0, BUN.CY + r * BUN.SY * Math.cos(a) + 0.002, 0], [PI / 2, 0, 0]);
};

// Roti bulat: badan + topping (tutup bola) + dekorasi
function bun(base, cap, extra) {
  const list = [
    P(sph(BUN.R), base, [0, BUN.CY, 0], [0, 0, 0], [1, BUN.SY, 1]),
    P(sph(BUN.R * 1.04, 0, TAU, 0, PI * 0.44), cap, [0, BUN.CY, 0], [0, 0, 0], [1, BUN.SY, 1]),
    ...extra(),
  ];
  return model([part('solid', list)], { fp: [0.3, 0.3], scale: 0.62, maxRows: 4, jitter: 0.7 });
}
const CHIPS = [[0.12, 0], [0.2, 1.2], [0.2, 2.6], [0.27, 3.9], [0.27, 5.1], [0.33, 0.4], [0.33, 2.0], [0.33, 3.4]];
const SESAME = [[0.2, 0.3], [0.2, 1.9], [0.26, 3.2], [0.26, 4.5], [0.32, 5.6], [0.32, 0.9], [0.14, 4]];
const CHEESE = [[0.06, 0.5], [0.16, 1.5], [0.16, 3.6], [0.24, 5.0], [0.24, 2.4], [0.3, 0.2]];

const coffeeBun = () => bun('#D9A66B', '#8A5A36', () => [capRing(0.16, 0.007, '#CFA77C'), capRing(0.3, 0.007, '#CFA77C')]);
const rotiBoyCokelat = () => bun('#D9A66B', '#5A3320', () => [
  ...CHIPS.map(([t, p]) => P(sph(0.016), '#2B140C', capPt(t, p, 1.05), [0, 0, 0], [1, 0.6, 1])),
  capRing(0.22, 0.007, '#F1E4CF'),
]);
const rotiBoyOriginal = () => bun('#E3B572', '#D99A45', () => [
  P(sph(0.04), '#FFF1CF', [0, BUN.CY + BUN.R * 1.04 * BUN.SY - 0.002, 0], [0, 0, 0], [1, 0.6, 1]),
  ...SESAME.map(([t, p]) => P(sph(0.009), '#FFF6DF', capPt(t, p, 1.045), [0, 0, 0], [1, 0.6, 1])),
]);
const rotiBoyKeju = () => bun('#E3B572', '#E9B84F', () =>
  CHEESE.map(([t, p], i) => P(box(0.04, 0.022, 0.04), '#FFD84A', capPt(t, p, 1.03), [0.3 * i, 0.7 * i, 0.2 * i])));

// Banana cake: loaf berkubah, retakan atas, irisan pisang, pembungkus kertas
function bananaCake() {
  const l = [
    P(box(0.34, 0.1, 0.17), '#B87433', [0, 0.05, 0]),
    P(cyl(0.085, 0.085, 0.34, 16), '#A05F28', [0, 0.1, 0], [0, 0, PI / 2], [0.75, 1, 1]), // kubah memanjang di sumbu X
    P(box(0.26, 0.012, 0.016), '#6E3A15', [0, 0.163, 0]),
    ...[-0.1, 0, 0.1].map((x, i) => P(cyl(0.034, 0.034, 0.01, 12), '#F4E3A1', [x, 0.158, i % 2 ? 0.03 : -0.03], [0.15 * i, 0, 0.1])),
    P(box(0.06, 0.104, 0.176), '#F3E9DA', [0, 0.052, 0]),
  ];
  return model([part('solid', l)], { fp: [0.34, 0.18], scale: 0.75, maxRows: 4, jitter: 0.25 });
}

// Roti sosis: roti memanjang + sosis menyembul di kedua ujung + saus zig-zag
function rotiSosis() {
  const l = [
    P(caps(0.065, 0.17), '#D9A058', [0, 0.065, 0], [0, 0, PI / 2]),
    P(caps(0.04, 0.26), '#B23A28', [0, 0.125, 0], [0, 0, PI / 2]),
    ...[-0.1, -0.035, 0.03, 0.095].map((x, i) => P(sph(0.018), i % 2 ? '#F2C230' : '#D6342C', [x, 0.162, 0], [0, 0, 0], [1.4, 0.6, 1.4])),
  ];
  return model([part('solid', l)], { fp: [0.36, 0.15], scale: 0.75, maxRows: 4, jitter: 0.2 });
}

/* ---------------- BAHAN MINUMAN ---------------- */
// Botol/galon: kaca transparan + cairan (tinggi mengikuti stok) + label, tutup, pompa, pegangan
function bottle({ r, hb, sh, nr, nh, liquid, label, accent, capColor = '#111111', pump = false, handle = false, glass = '#DCEEF0', fp }) {
  const top = hb + sh + nh;
  const g = [
    P(cyl(r, r, hb), glass, [0, hb / 2, 0]),
    P(cyl(nr, r, sh), glass, [0, hb + sh / 2, 0]),
    P(cyl(nr, nr, nh, 10), glass, [0, hb + sh + nh / 2, 0]),
  ];
  const lq = [P(cyl(r * 0.88, r * 0.88, hb + sh * 0.5), liquid, [0, (hb + sh * 0.5) / 2 + 0.006, 0])];
  const s = [
    P(cyl(r * 1.03, r * 1.03, hb * 0.42), label, [0, hb * 0.42, 0]),
    P(cyl(r * 1.04, r * 1.04, 0.012), accent, [0, hb * 0.57, 0]),
    P(cyl(nr * 1.25, nr * 1.25, 0.035, 10), capColor, [0, top + 0.012, 0]),
  ];
  if (pump) {
    s.push(P(cyl(0.006, 0.006, 0.07, 6), '#111111', [0, top + 0.06, 0]));
    s.push(P(box(0.05, 0.022, 0.03), '#111111', [0.012, top + 0.1, 0]));
    s.push(P(box(0.04, 0.01, 0.012), '#B07A3A', [0.045, top + 0.1, 0]));
  }
  if (handle) s.push(P(ring(0.045, 0.012), '#EDEAE2', [r + 0.015, hb * 0.8, 0]));
  return model([part('glass', g), part('liquid', lq), part('solid', s)], { fp, scale: 1 });
}
const MILK = { r: 0.1, hb: 0.2, sh: 0.07, nr: 0.045, nh: 0.03, label: '#4A7FBF', accent: '#F8F1E7', capColor: '#6B1F23', handle: true, glass: '#E8F1F3', fp: [0.3, 0.24] };
const SYRUP_GULA = { r: 0.055, hb: 0.2, sh: 0.06, nr: 0.026, nh: 0.045, label: '#F3E9DA', accent: '#B07A3A', fp: [0.15, 0.15] };
const SYRUP_CARAMEL = { r: 0.048, hb: 0.25, sh: 0.05, nr: 0.024, nh: 0.04, label: '#6B1F23', accent: '#F3E9DA', pump: true, fp: [0.14, 0.14] };

const milkJug = () => bottle({ ...MILK, liquid: '#FAF7EF' });
const gulaAren = () => bottle({ ...SYRUP_GULA, liquid: '#6B3A12', capColor: '#111111' });
const sirupCaramel = () => bottle({ ...SYRUP_CARAMEL, liquid: '#D08A24' });

// Kantong biji kopi (stand-up pouch)
function coffeeBag() {
  const l = [
    P(box(0.18, 0.26, 0.08), '#4A2C1A', [0, 0.13, 0]),
    P(box(0.19, 0.03, 0.09), '#2A180D', [0, 0.275, 0]),
    P(box(0.12, 0.12, 0.006), '#E8D5B0', [0, 0.13, 0.043]),
    P(cyl(0.032, 0.032, 0.008, 16), '#B07A3A', [0, 0.14, 0.047], [PI / 2, 0, 0]),
    P(box(0.07, 0.012, 0.007), '#4A2C1A', [0, 0.085, 0.047]),
    P(cyl(0.012, 0.012, 0.012, 8), '#111111', [0.05, 0.22, 0.043], [PI / 2, 0, 0]),
  ];
  return model([part('solid', l)], { fp: [0.22, 0.12], jitter: 0.2 });
}
// Kaleng bubuk taro
function taroCan() {
  const l = [
    P(cyl(0.095, 0.095, 0.24), '#9B7BB8', [0, 0.12, 0]),
    P(cyl(0.1, 0.1, 0.035), '#F4EEF8', [0, 0.2575, 0]),
    P(cyl(0.097, 0.097, 0.09), '#F3E9DA', [0, 0.12, 0]),
    P(sph(0.034), '#7C5A9C', [0, 0.12, 0.092], [0, 0, 0], [1, 1.25, 0.25]),
    P(cyl(0.099, 0.099, 0.012), '#B07A3A', [0, 0.17, 0]),
  ];
  return model([part('solid', l)], { fp: [0.21, 0.21], jitter: 0.5 });
}
// Kotak teh
function teaBox() {
  const l = [
    P(box(0.2, 0.27, 0.09), '#4F7D3E', [0, 0.135, 0]),
    P(box(0.205, 0.03, 0.095), '#2F5A25', [0, 0.255, 0]),
    P(box(0.13, 0.12, 0.006), '#F3E9DA', [0, 0.13, 0.047]),
    P(sph(0.028), '#5E8C4A', [0, 0.135, 0.052], [0, 0, 0.6], [1, 1.7, 0.18]),
    P(box(0.13, 0.008, 0.007), '#B07A3A', [0, 0.065, 0.048]),
  ];
  return model([part('solid', l)], { fp: [0.22, 0.12], jitter: 0.2 });
}
// Sleeve cup plastik bertumpuk (bibir tiap cup terlihat)
function cupSleeve() {
  const rAt = (y) => 0.054 + (0.075 - 0.054) * (y / 0.3);
  const g = [P(cyl(0.075, 0.054, 0.3, 18), '#EAF2F4', [0, 0.15, 0])];
  const s = [0.3, 0.245, 0.19, 0.135].map((y) => P(ring(rAt(y) + 0.002, 0.005), '#F8F5EE', [0, y, 0], [PI / 2, 0, 0]));
  s.push(P(cyl(0.0585, 0.0575, 0.05), '#6B1F23', [0, 0.03, 0]));
  return model([part('glass', g), part('solid', s)], { fp: [0.17, 0.17], jitter: 0.5 });
}
// Kemasan kotak generik (untuk item baru bershape "box")
const pack = (color) => model([part('solid', [
  P(box(0.2, 0.26, 0.1), color, [0, 0.13, 0]),
  P(box(0.205, 0.03, 0.105), '#2B2B2B', [0, 0.255, 0]),
  P(box(0.12, 0.1, 0.006), '#F3E9DA', [0, 0.13, 0.052]),
])], { fp: [0.22, 0.12], jitter: 0.2 });

/* ---------------- REGISTRI ---------------- */
const BUILD = {
  'banana-cake': bananaCake, 'coffee-bun': coffeeBun, 'roti-sosis': rotiSosis,
  'roti-boy-cokelat': rotiBoyCokelat, 'roti-boy-original': rotiBoyOriginal, 'roti-boy-keju': rotiBoyKeju,
  kopi: coffeeBag, susu: milkJug, 'gula-aren': gulaAren, 'sirup-caramel': sirupCaramel,
  'bubuk-taro': taroCan, teh: teaBox, cup: cupSleeve,
};
// Item baru di data.json otomatis dapat bentuk generik sesuai "shape"-nya
const FALLBACK = {
  tray: (it) => bun('#D9A66B', it.color, () => []),
  box: (it) => pack(it.color),
  bottle: (it) => bottle({ ...SYRUP_GULA, liquid: it.color }),
  gallon: (it) => bottle({ ...MILK, liquid: it.color }),
  cup: () => cupSleeve(),
};
const cache = new Map();
export function getModel(item) {
  if (!cache.has(item.id)) cache.set(item.id, (BUILD[item.id] || FALLBACK[item.shape] || FALLBACK.box)(item));
  return cache.get(item.id);
}