import { useSyncExternalStore } from 'react';
import { useStore } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import { TOUR } from './layout.js';
import { TOUR_TEXT } from './tourScript.js';

// Tur kamera otomatis dengan penjelasan. Penerbangan kamera dikerjakan CameraRig (store.cam).
// Jeda: tur berhenti di area itu. Lanjut: terbang ke area berikutnya lalu jalan otomatis lagi.
// Tur berhenti total bila kamera diubah pihak lain (tombol kamera, memilih objek) atau pengguna keluar.
// Seret / zoom kamera hanya MENJEDA tur (lihat pauseTour, dipanggil CameraRig).
let on = false, paused = false, timer = 0, tourN = -1, unsub = null, idx = 0, dur = 0, key = 0;
const EMPTY = { on: false, paused: false, i: 0, total: 0, label: '', title: '', lead: '', points: [], dur: 0, key: 0 };
let snap = EMPTY;
const subs = new Set();

// Hanya area di zona yang boleh dilihat peran ini, digabung dengan teks penjelasannya
const steps = () => {
  const u = useStore.getState().user;
  const zones = u ? ROLES[u.role].zones : [];
  return TOUR.steps.filter((s) => !s.zone || zones.includes(s.zone)).map((s) => ({ ...s, ...(TOUR_TEXT[s.id] || {}) }));
};
const words = (s) => [s.lead || '', ...(s.points || [])].join(' ').split(/\s+/).filter(Boolean).length;
const durOf = (s) => (Math.max(s.secs, TOUR.pace.base + words(s) * TOUR.pace.perWord) + 1.1) * 1000; // + waktu terbang kamera

function publish() {
  const s = on ? steps()[idx] : null;
  snap = s
    ? { on: true, paused, i: idx, total: steps().length, label: s.label, title: s.title || s.label, lead: s.lead || '', points: s.points || [], dur, key }
    : EMPTY;
  subs.forEach((fn) => fn());
}

function show(i) {
  if (!on) return;
  const list = steps();
  if (!list.length) { stopTour(); return; }
  idx = Math.max(0, Math.min(i, list.length - 1));
  const s = list[idx];
  tourN = useStore.getState().cam.n + 1;
  useStore.setState({ selected: null, view: s.view ?? null, cam: { look: s.look, dir: s.dir, dist: s.dist, n: tourN } });
  dur = durOf(s); key += 1;
  clearTimeout(timer);
  if (!paused) timer = setTimeout(advance, dur);
  publish();
}

function advance() {
  if (!on) return;
  if (idx + 1 >= steps().length) { stopTour(); return; } // area terakhir selesai -> tur berakhir
  show(idx + 1);
}

export function startTour() {
  if (on) return;
  on = true; paused = false;
  unsub = useStore.subscribe((st) => { if (on && (!st.user || st.cam.n !== tourN)) stopTour(); });
  show(0);
}

export function stopTour() {
  if (!on) return;
  on = false; paused = false;
  clearTimeout(timer);
  unsub?.(); unsub = null;
  publish();
}

// Tahan di area ini (tanpa batas waktu). Dipakai tombol Jeda dan saat kamera diseret / di-zoom
export function pauseTour() {
  if (!on || paused) return;
  paused = true;
  clearTimeout(timer);
  publish();
}

// Lanjut = terbang ke area berikutnya dan jalan otomatis lagi (di area terakhir = selesai)
export function nextTour() {
  if (!on) return;
  paused = false;
  advance();
}

// Kembali ke area sebelumnya; status jeda dipertahankan
export function prevTour() {
  if (!on || idx <= 0) return;
  show(idx - 1);
}

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const useTour = () => useSyncExternalStore(subscribe, () => snap);