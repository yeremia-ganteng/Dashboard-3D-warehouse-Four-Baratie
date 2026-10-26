import { useStore, itemMap, roti } from '../store/useStore.js';
import { GROUPS } from '../scene/layout.js';
import { STATUS, LOC_NAME, DAY_LABELS, statusOf, worst, fmtNum, fmtTime, sid } from '../store/helpers.js';
import BarChart from './BarChart.jsx';

const Chip = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS[status].chip}`}>
    <span aria-hidden="true">{STATUS[status].icon}</span>{STATUS[status].label}
  </span>
);

function StockDetail({ id }) {
  const s = useStore((st) => st.stocks[id]);
  if (!s) return null;
  const it = itemMap[s.item];
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">{LOC_NAME[s.loc]}</p>
        <h2 className="font-display text-xl font-semibold">{it.name}</h2>
      </div>
      <div className="flex items-center gap-3">
        <p><span className="text-3xl font-semibold">{fmtNum(s.qty)}</span> {it.unit}</p>
        <Chip status={statusOf(s)} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div><dt className="text-neutral-600">Ambang batas</dt><dd className="font-semibold">{fmtNum(s.min)} {it.unit}</dd></div>
        <div><dt className="text-neutral-600">Kapasitas rak</dt><dd className="font-semibold">{fmtNum(s.cap)} {it.unit}</dd></div>
        <div><dt className="text-neutral-600">Update terakhir</dt><dd className="font-semibold">{fmtTime(s.updatedAt)}</dd></div>
        <div><dt className="text-neutral-600">Diupdate oleh</dt><dd className="font-semibold">{s.updatedBy}</dd></div>
      </dl>
      <div>
        <h3 className="mb-1 text-sm font-semibold">Riwayat 7 hari <span className="text-xs font-normal text-neutral-600">(DATA DEMO)</span></h3>
        <BarChart values={s.hist} labels={DAY_LABELS} fmt={fmtNum} height={120} label={`Riwayat stok 7 hari ${it.name}`} />
      </div>
    </>
  );
}

function GroupDetail({ id }) {
  const g = GROUPS[id];
  const stocks = useStore((s) => s.stocks);
  const rows = roti.map((i) => stocks[sid(i.id, g.loc)]);
  const total = rows.reduce((a, r) => a + r.qty, 0);
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">{LOC_NAME[g.loc]}</p>
        <h2 className="font-display text-xl font-semibold">{g.name}</h2>
      </div>
      <p><span className="text-3xl font-semibold">{fmtNum(total)}</span> pcs roti</p>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span>{itemMap[r.item].name}</span>
            <span className="flex items-center gap-2"><b>{fmtNum(r.qty)}</b><Chip status={statusOf(r)} /></span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-600">Status terburuk: <Chip status={worst(rows.map(statusOf))} /></p>
    </>
  );
}

// variant "float": kartu di atas scene (desktop). variant "inline": di atas panel (mobile)
export default function DetailPanel({ variant }) {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  if (!selected) return null;
  const cls = variant === 'float'
    ? 'hidden lg:block absolute left-3 top-3 z-20 w-80 max-h-[calc(100%-7rem)] overflow-auto'
    : 'lg:hidden m-4 mb-0';
  return (
    <section aria-label="Detail item" className={`card relative space-y-3 !bg-white p-4 ${cls}`}>
      <button className="pill pill-ghost absolute right-2 top-2 !px-0" aria-label="Tutup detail" onClick={() => select(null)}>✕</button>
      {selected.type === 'stock' ? <StockDetail id={selected.id} /> : <GroupDetail id={selected.id} />}
    </section>
  );
}