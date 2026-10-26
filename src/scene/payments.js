import { useSyncExternalStore } from 'react';
import { PAYMENT } from './layout.js';

// Keadaan pembayaran simulasi (DATA DEMO), di luar React. Ditulis Customers.jsx, dibaca PovPanel & PaymentStats.
// Hanya di memori: tidak disimpan, tidak masuk antrean sinkronisasi.
//   tx[uid]      : transaksi satu pelanggan { stationId, phase, step, method, total, given, change, text, drink }
//                  phase: ordering | choosing | paying | done | step: give/change (tunai), scan/tap/confirm
//   serving[sid] : uid pelanggan yang sedang dilayani di stasiun itu
//   stats        : jumlah & omzet per metode (sesi ini) | last[sid] : transaksi terakhir stasiun
export const METHODS = [
  { id: 'tunai', label: 'Tunai', icon: '💵' },
  { id: 'qris', label: 'QRIS', icon: '📱' },
  { id: 'kartu', label: 'Kartu', icon: '💳' },
];
export const payLabel = (id) => { const m = METHODS.find((x) => x.id === id); return m ? `${m.icon} ${m.label}` : ''; };

const blank = () => ({ tunai: { n: 0, sum: 0 }, qris: { n: 0, sum: 0 }, kartu: { n: 0, sum: 0 } });
let tx = {}, serving = {}, stats = blank(), last = {};
const build = () => ({
  tx: { ...tx }, serving: { ...serving }, last: { ...last },
  stats: { tunai: { ...stats.tunai }, qris: { ...stats.qris }, kartu: { ...stats.kartu } },
});
let snap = build();
const subs = new Set();
const emit = () => { snap = build(); subs.forEach((fn) => fn()); };

// Pelanggan memilih metode secara acak menurut PAYMENT.mix
export function pickMethod() {
  const m = PAYMENT.mix, ids = ['tunai', 'qris', 'kartu'];
  let r = Math.random() * ids.reduce((a, id) => a + m[id], 0);
  for (const id of ids) { r -= m[id]; if (r <= 0) return id; }
  return 'qris';
}
// Uang tunai yang diserahkan: pecahan terkecil >= total (kadang satu tingkat di atasnya)
export function cashFor(total) {
  const ge = PAYMENT.bills.filter((b) => b >= total);
  if (!ge.length) return Math.ceil(total / 10000) * 10000;
  return Math.random() < PAYMENT.nextBillChance && ge[1] ? ge[1] : ge[0];
}

export function payOpen(uid, data) { tx[uid] = { uid, phase: 'ordering', step: '', method: null, given: 0, change: 0, ...data }; emit(); }
export function payUpdate(uid, patch) { if (tx[uid]) { tx[uid] = { ...tx[uid], ...patch }; emit(); } }
export function payClose(uid) {
  delete tx[uid];
  Object.keys(serving).forEach((k) => { if (serving[k] === uid) delete serving[k]; });
  emit();
}
export function payServe(stationId, uid) { serving[stationId] = uid; emit(); }
export function payRelease(stationId, uid) { if (serving[stationId] === uid) { delete serving[stationId]; emit(); } }
export function payRecord(method, total, stationId, no) {
  if (!stats[method]) return;
  stats[method].n += 1; stats[method].sum += total;
  last[stationId] = { method, total, no };
  emit();
}
export function payClearLive() { tx = {}; serving = {}; emit(); }
export function resetPayments() { stats = blank(); last = {}; emit(); }

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const usePayments = () => useSyncExternalStore(subscribe, () => snap);