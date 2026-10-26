import { METHODS, usePayments } from '../scene/payments.js';
import { rupiah } from '../store/helpers.js';

// Rekap metode pembayaran dari simulasi (DATA DEMO): hanya di memori sesi ini, tidak disinkronkan
export default function PaymentStats() {
  const { stats } = usePayments();
  const rows = METHODS.map((m) => ({ ...m, ...stats[m.id] }));
  const n = rows.reduce((a, r) => a + r.n, 0);
  const sum = rows.reduce((a, r) => a + r.sum, 0);
  return (
    <section className="card space-y-3 p-4" aria-labelledby="h-pay">
      <h2 id="h-pay" className="font-display text-lg font-semibold">Metode pembayaran</h2>
      {n === 0 ? (
        <p className="text-sm text-neutral-600">Belum ada pembayaran. Nyalakan simulasi dan tunggu pelanggan membayar.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const share = n ? Math.round((r.n / n) * 100) : 0;
            return (
              <li key={r.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span><span aria-hidden="true">{r.icon}</span> <b>{r.label}</b> · {r.n} transaksi</span>
                  <span className="font-semibold">{rupiah(r.sum)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(176,122,58,.18)' }}>
                  <div className="h-full rounded-full bg-marun" style={{ width: `${share}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-neutral-600">{share}% dari transaksi</p>
              </li>
            );
          })}
          <li className="flex justify-between border-t border-gold/30 pt-2 text-sm font-semibold">
            <span>Total sesi ini</span><span>{rupiah(sum)}</span>
          </li>
        </ul>
      )}
      <p className="text-xs text-neutral-600">DATA DEMO · hasil simulasi sejak halaman dimuat. Proporsi metode adalah asumsi simulasi, bukan data bisnis.</p>
    </section>
  );
}