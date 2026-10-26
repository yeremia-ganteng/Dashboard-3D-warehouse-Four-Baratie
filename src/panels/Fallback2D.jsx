import { useStore, itemMap } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import { STATUS, LOC_NAME, statusOf, fmtNum } from '../store/helpers.js';

// Denah datar bila WebGL tidak didukung / perangkat lemah
export default function Fallback2D() {
  const stocks = useStore((s) => s.stocks);
  const user = useStore((s) => s.user);
  const select = useStore((s) => s.select);
  return (
    <div className="grid h-full gap-3 overflow-auto bg-cream-2 p-3 pb-28 md:grid-cols-2">
      {ROLES[user.role].zones.map((loc) => (
        <section key={loc} className="card bg-white p-3">
          <h2 className="mb-2 font-display text-lg font-semibold">{LOC_NAME[loc]}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.values(stocks).filter((s) => s.loc === loc).map((s) => {
              const st = statusOf(s);
              const pct = Math.min(100, (s.qty / s.cap) * 100);
              return (
                <button key={s.id} onClick={() => select({ type: 'stock', id: s.id })} className="min-h-[44px] rounded-2xl border border-gold/40 bg-cream p-2 text-left">
                  <p className="text-sm font-semibold leading-tight">{itemMap[s.item].name}</p>
                  <p className="text-sm">{fmtNum(s.qty)} {itemMap[s.item].unit}</p>
                  <div className="my-1 h-2 overflow-hidden rounded-full bg-cream-2"><div className="h-full bg-marun" style={{ width: `${pct}%` }} /></div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS[st].chip}`}>{STATUS[st].icon} {STATUS[st].label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}