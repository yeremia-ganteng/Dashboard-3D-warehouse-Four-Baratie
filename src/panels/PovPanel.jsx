import { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { STATIONS } from '../scene/layout.js';
import { usePov, startPov, stopPov, nextCustomer } from '../scene/pov.js';
import { METHODS, payLabel, usePayments } from '../scene/payments.js';
import { rupiah } from '../store/helpers.js';

// Teks status langkah pembayaran, menurut sudut pandang kasir / pelanggan (DATA DEMO)
function statusLine(cashier, tx) {
  if (!tx) return cashier ? 'Menunggu pelanggan di kasir…' : 'Belum di kasir. Metode pembayaran dipilih saat tiba di kasir.';
  const { phase, method, step, given, change } = tx;
  if (phase === 'ordering') return cashier ? 'Pelanggan menyebutkan pesanan…' : 'Menyebutkan pesanan ke kasir…';
  if (phase === 'choosing') return cashier ? 'Menanyakan metode pembayaran…' : 'Kasir bertanya: bayar pakai apa?';
  if (phase === 'paying') {
    if (method === 'tunai') {
      if (step === 'change') return cashier ? `Memberi kembalian ${rupiah(change)}` : `Menerima kembalian ${rupiah(change)}`;
      return cashier ? `Menerima uang tunai ${rupiah(given)}` : `Menyerahkan uang ${rupiah(given)}`;
    }
    if (method === 'qris') {
      if (step === 'confirm') return cashier ? 'Notifikasi QRIS masuk ✓' : 'QRIS berhasil ✓';
      return cashier ? 'Menunggu pelanggan scan QRIS…' : 'Scan QRIS di meja kasir…';
    }
    if (step === 'confirm') return cashier ? 'EDC: kartu disetujui ✓' : 'Kartu disetujui ✓';
    return cashier ? 'Menunggu tap kartu di EDC…' : 'Tap / gesek kartu di mesin EDC…';
  }
  const name = METHODS.find((m) => m.id === method)?.label ?? '';
  const base = cashier ? `Pembayaran ${name} diterima ✓` : `Pembayaran ${name} berhasil ✓`;
  return base + (tx.drink ? (cashier ? ' · minuman disiapkan barista' : ' · ambil minuman di Bar Kopi') : '');
}

// Panel POV: menu metode pembayaran (dipilih otomatis oleh simulasi) + status langkah
export default function PovPanel() {
  const pov = usePov();
  const pay = usePayments();
  const sim = useStore((s) => s.sim);
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  if (!pov.on) return null;

  const cashier = pov.mode === 'cashier';
  const st = STATIONS[pov.station];
  const uid = cashier ? pay.serving[st?.id] : pov.subjectUid;
  const tx = uid != null ? pay.tx[uid] : null;
  const phase = tx?.phase;
  const chosen = tx && (phase === 'paying' || phase === 'done') ? tx.method : null;
  const last = cashier ? pay.last[st?.id] : null;
  const s = pay.stats;
  const line = pov.waiting
    ? (sim ? 'Menunggu pelanggan datang…' : 'Simulasi mati. Nyalakan simulasi agar pelanggan datang.')
    : statusLine(cashier, tx);

  return (
        <section className="card pov-card absolute left-3 top-3 z-20 w-[min(22rem,calc(100%-1.5rem))] p-3 text-sm shadow-card" aria-label={cashier ? `POV ${st?.name}` : 'POV Pelanggan'}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{cashier ? `POV ${st?.name}` : 'POV Pelanggan'}</h2>
        <span className="rounded-full bg-marun px-2 py-0.5 text-[10px] font-semibold text-cream">DATA DEMO</span>
      </div>

      {!small && tx && (
        <p className="mt-1 text-xs text-neutral-600">
          {tx.text} · <b className="text-neutral-900">{rupiah(tx.total)}</b>
        </p>
      )}

      <p className="mt-2 text-xs font-semibold">{cashier ? 'Metode diterima' : 'Pilih pembayaran'}</p>
      <ul className="pay-tiles" aria-label="Metode pembayaran">
        {METHODS.map((m) => {
          const on = chosen === m.id;
          const off = chosen && !on;
          const pulse = phase === 'choosing';
          return (
            <li key={m.id} className={`pay-tile${on ? ' is-on' : ''}${off ? ' is-off' : ''}${pulse ? ' is-pulse' : ''}`} aria-current={on ? 'true' : undefined}>
              <span className="ic" aria-hidden="true">{m.icon}</span>
              <span>{m.label}{on && <span className="sr-only"> (dipilih)</span>}</span>
              {on && <span aria-hidden="true" className="text-[10px] leading-none">✓ Dipilih</span>}
            </li>
          );
        })}
      </ul>

      <p className="min-h-[2.5em] text-xs" role="status" aria-live="polite">{line}</p>

      {!small && tx?.method === 'tunai' && (phase === 'paying' || phase === 'done') && (
        <p className="text-xs text-neutral-600">Uang {rupiah(tx.given)} · kembalian {rupiah(tx.change)}</p>
      )}
      {!small && cashier && !tx && last && (
        <p className="text-xs text-neutral-600">Terakhir: #{last.no} · {payLabel(last.method)} · {rupiah(last.total)}</p>
      )}
      {!small && cashier && (
        <p className="mt-1 text-xs text-neutral-600">
          Sesi ini: Tunai {s.tunai.n} · QRIS {s.qris.n} · Kartu {s.kartu.n}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {cashier ? STATIONS.map((x, i) => (
          <button key={x.id} className={`pill ${pov.station === i ? 'pill-active' : 'pill-ghost'}`} aria-pressed={pov.station === i} onClick={() => startPov('cashier', i)}>{x.name}</button>
        )) : (
          <button className="pill pill-ghost" onClick={nextCustomer}>Ganti pelanggan</button>
        )}
        <button className="pill pill-ghost" aria-expanded={!small} onClick={() => setSmall(!small)}>{small ? 'Detail' : 'Ringkas'}</button>
        <button className="pill pill-primary" onClick={() => stopPov(true)}>Keluar POV</button>
      </div>
      <p className="mt-2 text-[10px] text-neutral-600">DATA DEMO · metode bayar dipilih otomatis oleh simulasi.</p>
    </section>
  );
}