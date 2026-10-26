import { useSyncExternalStore } from 'react';

// Tingkat detail label stok menurut jarak kamera -> target.
//   'near' = lengkap | 'mid' = ringkas (ikon + angka) | 'far' = lencana (hanya item bermasalah)
// sparse = rak renggang (rak roti Produksi) | dense = rak rapat (etalase & rak bahan Outlet)
// near/far = batas jarak (unit scene). hyst = penahan supaya label tidak berkedip di batas.
// farShowOk: true = item aman tetap tampil sebagai lencana kecil saat kamera jauh.
export const LABEL_LOD = {
  sparse: { near: 26, far: 42 },
  dense: { near: 12, far: 34 },
  hyst: 1.5,
  farShowOk: false,
};

const state = { sparse: 'mid', dense: 'mid' };
const subs = new Set();

function next(cur, d, { near, far }, h) {
  if (cur === 'near') return d > near + h ? (d > far ? 'far' : 'mid') : 'near';
  if (cur === 'far') return d < far - h ? (d < near ? 'near' : 'mid') : 'far';
  if (d < near - h) return 'near';
  if (d > far + h) return 'far';
  return 'mid';
}

// Dipanggil CameraRig tiap frame. Pelanggan (label) hanya dirender ulang saat tingkatnya berubah.
export function setLabelDistance(d) {
  const a = next(state.sparse, d, LABEL_LOD.sparse, LABEL_LOD.hyst);
  const b = next(state.dense, d, LABEL_LOD.dense, LABEL_LOD.hyst);
  if (a === state.sparse && b === state.dense) return;
  state.sparse = a; state.dense = b;
  subs.forEach((fn) => fn());
}

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const useLabelLevel = (dense) => useSyncExternalStore(subscribe, () => (dense ? state.dense : state.sparse));