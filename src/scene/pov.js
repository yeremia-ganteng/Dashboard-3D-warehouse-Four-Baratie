import { useSyncExternalStore } from 'react';
import { useStore } from '../store/useStore.js';
import { ROLES, canSeeLoc } from '../store/roles.js';
import { HIP, SEAT_HIP } from '../objects/Person.jsx';
import { POV } from './layout.js';
import { stopTour } from './tour.js';

// Kamera orang pertama (POV) kasir / pelanggan. Pose kamera dihitung tiap frame di sini, dipakai CameraRig.
// Kepala figur yang diikuti disembunyikan supaya kamera tidak "di dalam" kepala. Berhenti sendiri bila kamera
// diubah pihak lain (tombol kamera, memilih objek, tur) atau pengguna keluar.
export const povSrc = { stations: [], people: () => [] }; // diisi Customers.jsx

let on = false, mode = 'cashier', stIdx = 0, subject = null, povN = -1, unsub = null, prevView = null;
let snap = { on: false, mode: 'cashier', station: 0, subjectUid: null, waiting: false };
const subs = new Set();
const emit = () => {
  snap = { on, mode, station: stIdx, subjectUid: on && mode === 'customer' && subject ? subject.uid : null, waiting: on && mode === 'customer' && !subject };
  subs.forEach((fn) => fn());
};

const setHead = (e, vis) => { const h = e?.rig?.head; if (h) h.visible = vis; };
function setSubject(e) {
  if (subject === e) return;
  setHead(subject, true);
  subject = e;
  setHead(subject, false);
  emit();
}

const RANK = { ordering: 0, queue: 1, walkIn: 2, waitDrink: 3, picking: 3, toBar: 4, toSeat: 5, sitting: 6, standing: 7, leaving: 8 };
const pickCustomer = (ppl) => ppl.reduce((best, p) => {
  if (!best) return p;
  const a = RANK[p.state] ?? 9, b = RANK[best.state] ?? 9;
  return a < b || (a === b && p.uid < best.uid) ? p : best;
}, null);

// Siapa yang diikuti kamera saat ini
function resolve() {
  if (mode === 'cashier') return povSrc.stations[stIdx]?.K ?? null;
  const ppl = povSrc.people().filter((p) => p.rig?.root?.visible !== false);
  const alive = !!subject && ppl.includes(subject);
  if (alive && subject.state !== 'leaving') return subject;
  const best = pickCustomer(ppl.filter((p) => p !== subject && p.state !== 'leaving'));
  return best || (alive ? subject : null); // pelanggan yang pergi diganti yang berikutnya
}

// Isi out = { px,py,pz (posisi mata), lx,ly,lz (titik pandang) }. false = belum ada orang untuk diikuti
export function povPose(out) {
  const e = resolve();
  if (e !== subject) setSubject(e);
  if (!e) {
    const w = POV.wait;
    out.px = w.pos[0]; out.py = w.pos[1]; out.pz = w.pos[2];
    out.lx = w.look[0]; out.ly = w.look[1]; out.lz = w.look[2];
    return false;
  }
  const cashier = mode === 'cashier';
  const sit = cashier ? 0 : e.sit || 0;
  const y = HIP + (SEAT_HIP - HIP) * sit + POV.eyeUp + (e.moving ? Math.abs(Math.cos(e.phase)) * 0.018 : 0);
  const dx = Math.sin(e.face), dz = Math.cos(e.face);
  const pitch = cashier ? POV.pitchCashier : POV.pitchCustomer, cp = Math.cos(pitch);
  out.px = e.x + dx * POV.fwd; out.py = y; out.pz = e.z + dz * POV.fwd;
  out.lx = out.px + dx * cp * 6; out.ly = y + Math.sin(pitch) * 6; out.lz = out.pz + dz * cp * 6;
  return true;
}

export function startPov(m, idx = 0) {
  const st = useStore.getState();
  if (!st.user || !canSeeLoc(st.user, 'outlet')) return;
  stopTour();
  if (!on) prevView = st.view;
  on = true; mode = m; stIdx = idx;
  setHead(subject, true); subject = null;
  povN = st.cam.n;
  useStore.setState({ selected: null, view: null });
  document.body.classList.add('pov-on');
  if (!unsub) unsub = useStore.subscribe((s) => { if (on && (!s.user || s.cam.n !== povN)) stopPov(false); });
  emit();
}

// restore = true: kamera terbang kembali ke tampilan sebelum POV (tombol Keluar)
export function stopPov(restore = false) {
  if (!on) return;
  on = false;
  setHead(subject, true); subject = null;
  unsub?.(); unsub = null;
  document.body.classList.remove('pov-on');
  emit();
  if (restore) {
    const s = useStore.getState();
    s.setView(prevView || (s.user ? ROLES[s.user.role].home : 'overview'));
  }
}

// Pelanggan berikutnya (urut kedatangan)
export function nextCustomer() {
  if (!on || mode !== 'customer') return;
  const ppl = povSrc.people().filter((p) => p.rig?.root?.visible !== false).sort((a, b) => a.uid - b.uid);
  if (!ppl.length) return;
  setSubject(ppl[(ppl.indexOf(subject) + 1) % ppl.length]);
}

export const isPovOn = () => on;
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const usePov = () => useSyncExternalStore(subscribe, () => snap);