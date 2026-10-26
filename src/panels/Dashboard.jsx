import { useState } from 'react';
import seed from '../data/data.json';
import { useStore, products, itemMap } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import { STATUS, LOC_NAME, statusOf, rupiah, fmtNum } from '../store/helpers.js';
import BarChart from './BarChart.jsx';
import StockTable from './StockTable.jsx';
import InputForms from './InputForms.jsx';
import OrderLog from './OrderLog.jsx';
import QueueStats from './QueueStats.jsx';
import PaymentStats from './PaymentsStats.jsx';
import { resetPayments } from '../scene/payments.js';
import { resetMetrics } from '../scene/simMetrics.js';

function Summary() {
  const sold = useStore((s) => s.sold);
  const delta = useStore((s) => s.delta);
  const entries = products.map((p) => ({ ...p, qty: sold[p.id] || 0 }));
  const omzet = entries.reduce((a, e) => a + e.qty * e.price, 0);
  const sorted = [...entries].sort((a, b) => b.qty - a.qty);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const Box = ({ t, v, s }) => (
    <div className="card p-3"><p className="text-xs text-neutral-600">{t}</p><p className="text-lg font-semibold leading-tight">{v}</p>{s && <p className="text-xs text-neutral-600">{s}</p>}</div>
  );
  return (
    <section aria-labelledby="h-ring">
      <h2 id="h-ring" className="mb-2 font-display text-lg font-semibold">Ringkasan hari ini</h2>
      <div className="grid grid-cols-2 gap-2">
        <Box t="Total transaksi" v={seed.sales.today.transactions + delta.trx} />
        <Box t="Total omzet" v={rupiah(omzet)} />
        <Box t="Terlaris" v={best.name} s={`${best.qty} terjual`} />
        <Box t="Kurang laris" v={worst.name} s={`${worst.qty} terjual`} />
      </div>
    </section>
  );
}

function SalesChart() {
  const delta = useStore((s) => s.delta);
  const [tab, setTab] = useState('harian');
  const src = tab === 'harian' ? seed.sales.daily : seed.sales.monthly;
  const bump = (arr, d) => arr.map((v, i) => (i === arr.length - 1 ? v + d : v)); // titik terakhir ikut transaksi live
  const omzet = bump(src.omzet, delta.omzet);
  const trx = bump(src.transactions, delta.trx);
  return (
    <section className="card p-4" aria-labelledby="h-chart">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="h-chart" className="font-display text-lg font-semibold">Omzet</h2>
        <div role="tablist" aria-label="Periode" className="flex gap-1">
          {['harian', 'bulanan'].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`pill capitalize ${tab === t ? 'pill-active' : 'pill-ghost'}`}>{t}</button>
          ))}
        </div>
      </div>
      <BarChart values={omzet} labels={src.labels} label={`Grafik omzet ${tab}`} />
      <table className="sr-only">
        <caption>Omzet dan transaksi {tab} (data demo)</caption>
        <thead><tr><th>Periode</th><th>Omzet</th><th>Transaksi</th></tr></thead>
        <tbody>{src.labels.map((l, i) => <tr key={l}><td>{l}</td><td>{rupiah(omzet[i])}</td><td>{trx[i]}</td></tr>)}</tbody>
      </table>
      <p className="mt-1 text-xs text-neutral-600">DATA DEMO · {tab === 'harian' ? '7 hari terakhir' : '6 bulan terakhir'}</p>
    </section>
  );
}

function Alerts() {
  const stocks = useStore((s) => s.stocks);
  const user = useStore((s) => s.user);
  const select = useStore((s) => s.select);
  const zones = ROLES[user.role].zones;
  const list = Object.values(stocks).filter((s) => zones.includes(s.loc) && statusOf(s) !== 'ok');
  return (
    <section className="card p-4" aria-labelledby="h-alert">
      <h2 id="h-alert" className="mb-2 font-display text-lg font-semibold">Peringatan stok</h2>
      {list.length === 0 ? <p className="text-sm">✓ Semua stok aman.</p> : (
        <ul className="space-y-2">
          {list.map((s) => {
            const st = statusOf(s);
            return (
              <li key={s.id}>
                <button onClick={() => select({ type: 'stock', id: s.id })} className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm ${STATUS[st].chip}`}>
                  <span><b>{itemMap[s.item].name}</b> · {LOC_NAME[s.loc]}</span>
                  <span className="shrink-0 font-semibold">{STATUS[st].icon} {st === 'empty' ? 'Habis' : `${fmtNum(s.qty)}/${fmtNum(s.min)}`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard() {
  const perms = ROLES[useStore((s) => s.user).role];
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-marun/30 bg-white/70 p-3 text-xs">
        <p><b className="text-marun">DATA DEMO.</b> {seed.meta.note}</p>
        {perms.sales && (
          <button className="pill pill-ghost mt-2" onClick={() => { useStore.getState().resetDemo(); resetMetrics(); resetPayments(); }}>Reset data demo</button>
        )}
      </div>
      {perms.sales && <Summary />}
      {perms.sales && <SalesChart />}
      {perms.sales && <OrderLog />}
      {perms.sales && <QueueStats />}
      {perms.sales && <PaymentStats />}
      <Alerts />
      <InputForms />
      <StockTable />
    </div>
  );
}