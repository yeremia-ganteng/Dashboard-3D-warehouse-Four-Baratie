import { INDOOR, OUT_X, OUT_Z, PICKUP } from './layout.js';

// Keadaan bersama (di luar React) untuk meja bar, meja kotor, gudang, dan oven.
// Ditulis oleh Customers.jsx / Delivery.jsx / Workers.jsx; dibaca Bar.jsx, TableMess.jsx, Gudang.jsx, OvenProgress.jsx tiap frame.
const HALF = Math.PI / 2;

// Kursi: 2 per meja (kiri-kanan, menghadap meja), meja dalam + meja halaman. tx/tz/d dipakai untuk menaruh piring bekas.
export const SEATS = [
  ...INDOOR.map((t) => [t.x, t.z]),
  ...OUT_X.map((x) => [x, OUT_Z]),
].flatMap(([tx, tz]) => [-1, 1].map((d) => ({
  tx, tz, d, x: tx + d * 0.74, z: tz, face: d > 0 ? -HALF : HALF,
}))).map((s, i) => ({ ...s, i }));

export const seatMess = SEATS.map(() => false);               // true = ada piring/gelas bekas di kursi itu
// ready = gelas siap diambil di slot itu | color = warna isi gelas (mengikuti varian, DATA DEMO)
export const bar = { ready: PICKUP.slots.map(() => false), color: PICKUP.slots.map(() => '#9A6A45') };
export const gudangStock = { cols: [] };                      // warna peti yang kini ada di gudang
export const setGudang = (cols) => { gudangStock.cols = [...cols]; };
// Progres panggang: on = oven sedang dipakai, p = 0..1, name/color = roti yang dipanggang
export const oven = { on: false, p: 0, name: '', color: '#D9A66B' };