import { STATIONS, CLOCK } from '../scene/layout.js';
import { useMetrics, resetMetrics } from '../scene/simMetrics.js';
import { useClock } from '../scene/simClock.js';
import { fmtNum } from '../store/helpers.js';

const ZERO = { served: 0, lost: 0, waitSum: 0, waitMax: 0, svcSum: 0, peakQ: 0, queue: 0, busyT: 0 };
const sec = (v) => (v == null ? '—' : `${fmtNum(Math.round(v * 10) / 10)} dtk`);
const pct = (v) => `${Math.round(v * 100)}%`;
const pad = (n) => String(n).padStart(2, '0');
const range = (lv) => CLOCK.profile.filter((p) => p.level === lv).map((p) => `${pad(p.from)}–${pad(p.to)}`).join(', ');

const Box = ({ t, v, s }) => (
  <div className="card p-3"><p className="text-xs text-neutral-600">{t}</p><p className="text-base font-semibold leading-tight">{v}</p>{s && <p className="text-xs text-neutral-600">{s}</p>}</div>
);
const Cell = ({ t, v }) => (
  <div><dt className="text-neutral-600">{t}</dt><dd className="font-semibold">{v}</dd></div>
);

// Kinerja kasir & barista dari simulasi (DATA DEMO): waktu tunggu, antrean, tingkat sibuk, kedatangan per jam
export default function QueueStats() {
  const m = useMetrics();
  const clock = useClock();

  const rows = STATIONS.map((cfg) => {
    const s = m.stations[cfg.id] || ZERO;
    return { ...cfg, ...s, avg: s.served ? s.waitSum / s.served : null, util: m.span > 0 ? s.busyT / m.span : 0 };
  });
  const served = rows.reduce((a, r) => a + r.served, 0);
  const overall = served ? rows.reduce((a, r) => a + r.waitSum, 0) / served : null;
  const busiest = rows.filter((r) => r.util > 0).sort((a, b) => b.util - a.util)[0];
  const longest = rows.filter((r) => r.peakQ > 0).sort((a, b) => b.peakQ - a.peakQ)[0];
  const bar = m.bar;
  const barUtil = m.span > 0 ? bar.busyT / m.span : 0;

  const hours = Array.from({ length: CLOCK.close - CLOCK.open }, (_, i) => CLOCK.open + i);
  const maxA = Math.max(1, ...hours.map((h) => m.arrivals[h]));
  const peakH = hours.reduce((b, h) => (m.arrivals[h] > m.arrivals[b] ? h : b), hours[0]);
  const hasData = m.span > 0 || m.arrivals.some(Boolean);
  const ramai = range('ramai'), sepi = range('sepi');

  return (
    <section className="card space-y-3 p-4" aria-labelledby="h-queue">
      <div className="flex items-center justify-between gap-2">
        <h2 id="h-queue" className="font-display text-lg font-semibold">Kinerja kasir</h2>
        <button className="pill pill-ghost" onClick={resetMetrics}>Reset metrik</button>
      </div>

      {!hasData ? (
        <p className="text-sm text-neutral-600">Belum ada data. Nyalakan simulasi dan tunggu pelanggan datang.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Box t="Rata-rata tunggu" v={sec(overall)} s={`${served} pelanggan dilayani`} />
            <Box t="Kasir tersibuk" v={busiest ? busiest.name : '—'} s={busiest ? `sibuk ${pct(busiest.util)}` : undefined} />
            <Box t="Antrean terpanjang" v={longest ? `${longest.peakQ} orang` : '—'} s={longest ? longest.name : undefined} />
            <Box t="Minuman (bayar → terima)" v={sec(bar.made ? bar.waitSum / bar.made : null)} s={`${bar.made} minuman`} />
          </div>

          {busiest && busiest.util >= 0.8 && (
            <p className="rounded-xl border border-[#E09A2B] bg-[#FFF0D1] p-2 text-xs text-[#7A4A00]">
              ▲ {busiest.name} sibuk {pct(busiest.util)} dari waktu buka. Antrean mudah menumpuk saat ramai.
            </p>
          )}

          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-gold/30 bg-cream p-2">
                <p className="text-sm font-semibold">
                  {r.name}
                  <span className="ml-1 text-xs font-normal text-neutral-600">
                    · {r.served} dilayani{r.lost > 0 ? ` · ${r.lost} gagal (stok habis)` : ''}
                  </span>
                </p>
                <dl className="mt-1 grid grid-cols-4 gap-1 text-center text-xs">
                  <Cell t="Antre" v={`${r.queue}/${r.peakQ}`} />
                  <Cell t="Tunggu rata²" v={sec(r.avg)} />
                  <Cell t="Terlama" v={sec(r.served ? r.waitMax : null)} />
                  <Cell t="Sibuk" v={pct(r.util)} />
                </dl>
              </div>
            ))}
            <div className="rounded-xl border border-gold/30 bg-cream p-2">
              <p className="text-sm font-semibold">Barista</p>
              <dl className="mt-1 grid grid-cols-3 gap-1 text-center text-xs">
                <Cell t="Minuman" v={bar.made} />
                <Cell t="Bayar → terima" v={sec(bar.made ? bar.waitSum / bar.made : null)} />
                <Cell t="Sibuk" v={pct(barUtil)} />
              </dl>
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">Kedatangan per jam · hari simulasi ke-{m.arrDay}</h3>
            <div className="flex h-20 items-end gap-1" role="img" aria-label={`Kedatangan per jam. Jam tersibuk ${pad(peakH)}:00 dengan ${m.arrivals[peakH]} pelanggan.`}>
              {hours.map((h) => {
                const n = m.arrivals[h];
                const now = h === clock.hour && m.arrDay === clock.day;
                return (
                  <div key={h} className="flex h-full flex-1 flex-col items-center justify-end">
                    <span className="text-[9px] leading-none text-neutral-600">{n || ''}</span>
                    <div className={`w-full rounded-t ${now ? 'bg-marun' : 'bg-gold'}`} style={{ height: `${Math.round((n / maxA) * 70)}%`, minHeight: n ? 2 : 0 }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-1" aria-hidden="true">
              {hours.map((h) => <span key={h} className="flex-1 text-center text-[9px] text-neutral-600">{pad(h)}</span>)}
            </div>
            <table className="sr-only">
              <caption>Kedatangan pelanggan per jam (data demo)</caption>
              <thead><tr><th>Jam</th><th>Pelanggan</th></tr></thead>
              <tbody>{hours.map((h) => <tr key={h}><td>{pad(h)}:00</td><td>{m.arrivals[h]}</td></tr>)}</tbody>
            </table>
            <p className="mt-1 text-xs text-neutral-600">Jam ramai (pengaturan simulasi): {ramai || '—'} · sepi: {sepi || '—'}.</p>
          </div>
        </>
      )}

      <p className="text-xs text-neutral-600">DATA DEMO · hasil simulasi, hanya di memori (hilang saat dimuat ulang), tidak dikirim ke backend. Waktu dalam detik nyata.</p>
    </section>
  );
}