import { useSyncExternalStore } from 'react';
import { clockHour, clockDay } from './simClock.js';

// Metrik antrean simulasi (DATA DEMO). Hanya di memori: tidak disimpan, tidak masuk antrean sinkronisasi.
// Satuan waktu = detik nyata. Antarmuka diperbarui paling sering 2x per detik.
const blankStation = () => ({ served: 0, lost: 0, waitSum: 0, waitMax: 0, svcSum: 0, peakQ: 0, queue: 0, busyT: 0 });
const fresh = () => ({ stations: {}, bar: { made: 0, waitSum: 0, busyT: 0 }, span: 0, arrivals: Array(24).fill(0), arrDay: clockDay() });

let M = fresh();
let acc = 0;
const subs = new Set();
const station = (id) => { if (!M.stations[id]) M.stations[id] = blankStation(); return M.stations[id]; };

function copy() {
  const stations = {};
  for (const id in M.stations) stations[id] = { ...M.stations[id] };
  return { stations, bar: { ...M.bar }, span: M.span, arrivals: [...M.arrivals], arrDay: M.arrDay };
}
let snap = copy();
const emit = () => { snap = copy(); subs.forEach((fn) => fn()); };

// Pelanggan baru masuk antrean stasiun `id`
export function metricsArrival(id) {
  const day = clockDay();
  if (M.arrDay !== day) { M.arrDay = day; M.arrivals = Array(24).fill(0); } // hari simulasi baru
  M.arrivals[clockHour()] += 1;
  station(id);
  emit();
}
// Pelanggan selesai dilayani: wait = lama di antrean, svc = lama dilayani
export function metricsServed(id, wait, svc) {
  const s = station(id);
  s.served += 1; s.waitSum += wait; s.svcSum += svc;
  if (wait > s.waitMax) s.waitMax = wait;
  emit();
}
// Dilayani tapi tidak ada barang terjual (stok habis)
export function metricsLost(id) { station(id).lost += 1; emit(); }
// Minuman diterima pelanggan: wait = dari bayar sampai diterima
export function metricsDrink(wait) { M.bar.made += 1; M.bar.waitSum += wait; emit(); }

// Dipanggil tiap frame. rows = [{ id, q, busy }]
export function metricsFrame(dt, counting, rows, barBusy) {
  if (!counting) return;
  M.span += dt;
  for (const r of rows) {
    const s = station(r.id);
    s.queue = r.q;
    if (r.q > s.peakQ) s.peakQ = r.q;
    if (r.busy) s.busyT += dt;
  }
  if (barBusy) M.bar.busyT += dt;
  acc += dt;
  if (acc >= 0.5) { acc = 0; emit(); }
}

export function resetMetrics() { M = fresh(); acc = 0; emit(); }

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const useMetrics = () => useSyncExternalStore(subscribe, () => snap);