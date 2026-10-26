import { TRAFFIC as TR } from './layout.js';

// Keadaan bersama (di luar React) antara Traffic.jsx dan Delivery.jsx.
//   truck.stage : tahap truk pengantar ('idle' | 'load' | 'go' | 'unload' | 'back'), ditulis Delivery.jsx
//   zebraBusy   : true bila ada pejalan yang sedang menyeberang (kendaraan harus berhenti)
//   ojolReady   : true bila paper bag ojol ada di meja pickup
//   veh         : kendaraan lain yang aktif di jalan
export const traffic = {
  truck: { stage: 'idle' },
  zebraBusy: false,
  ojolReady: false,
  veh: [],
};

// Aman bagi pejalan untuk mulai menyeberang? (truk tidak sedang di jalan, tidak ada kendaraan terlalu dekat)
export function zebraClear() {
  const st = traffic.truck.stage;
  if (st === 'go' || st === 'back') return false;
  return !traffic.veh.some((v) => v.x > TR.zebraX - 2.4 && v.x < TR.zebraX + TR.clearAhead);
}

// Masih ada kendaraan lain di jalan (selain motor ojol yang sedang parkir)? Truk menunggu ini sebelum pulang
export const farBusy = () => traffic.veh.some((v) => v.mode !== 'park');