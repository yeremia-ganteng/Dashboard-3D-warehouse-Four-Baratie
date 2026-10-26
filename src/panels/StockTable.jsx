import { useStore, itemMap } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import { STATUS, LOC_NAME, statusOf, fmtNum } from '../store/helpers.js';

// Semua info stok juga tersedia sebagai tabel (aksesibilitas, tidak hanya di 3D)
export default function StockTable() {
  const stocks = useStore((s) => s.stocks);
  const user = useStore((s) => s.user);
  const select = useStore((s) => s.select);
  return (
    <div className="space-y-4">
      {ROLES[user.role].zones.map((loc) => (
        <section key={loc} className="card overflow-x-auto p-4">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left font-display text-lg font-semibold">Stok — {LOC_NAME[loc]}</caption>
            <thead>
              <tr className="text-left text-xs text-neutral-600">
                <th scope="col" className="py-1">Item</th><th scope="col">Stok</th><th scope="col">Min</th><th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(stocks).filter((s) => s.loc === loc).map((s) => {
                const st = statusOf(s);
                return (
                  <tr key={s.id} className="border-t border-gold/20">
                    <th scope="row" className="py-0.5 text-left font-medium">
                      <button className="min-h-[44px] text-left underline-offset-2 hover:underline" onClick={() => select({ type: 'stock', id: s.id })}>
                        {itemMap[s.item].name}
                      </button>
                    </th>
                    <td>{fmtNum(s.qty)} {itemMap[s.item].unit}</td>
                    <td>{fmtNum(s.min)}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS[st].chip}`}>
                        <span aria-hidden="true">{STATUS[st].icon}</span>{STATUS[st].label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}