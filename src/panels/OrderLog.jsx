import { useStore, itemMap, drinks } from '../store/useStore.js';
import { rupiah, fmtNum } from '../store/helpers.js';
import { payLabel } from '../scene/payments.js';

const clock = (iso) => new Intl.DateTimeFormat('id-ID', { timeStyle: 'medium' }).format(new Date(iso));

// Rincian pesanan: minuman per varian, bahan terpakai, dan riwayat pesanan terbaru
export default function OrderLog() {
  const orders = useStore((s) => s.orders);
  const soldDrink = useStore((s) => s.soldDrink);

  // Bahan terpakai = jumlah terjual per varian x takaran resep
  const used = {};
  drinks.forEach((d) => Object.entries(d.recipe).forEach(([item, per]) => {
    used[item] = (used[item] || 0) + per * (soldDrink[d.id] || 0);
  }));
  const usedList = Object.entries(used).filter(([, v]) => v > 0);

  return (
    <section className="card space-y-4 p-4" aria-labelledby="h-orders">
      <h2 id="h-orders" className="font-display text-lg font-semibold">Pesanan pelanggan</h2>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Minuman terjual per varian</h3>
        <table className="w-full text-sm">
          <thead className="sr-only"><tr><th scope="col">Varian</th><th scope="col">Terjual</th></tr></thead>
          <tbody>
            {drinks.map((d) => (
              <tr key={d.id} className="border-t border-gold/20">
                <th scope="row" className="py-1 text-left font-medium">
                  <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full border border-black/10 align-middle" style={{ background: d.color }} />{d.name}
                </th>
                <td className="text-right font-semibold">{soldDrink[d.id] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Bahan terpakai dari pesanan</h3>
        {usedList.length === 0 ? <p className="text-sm text-neutral-600">Belum ada.</p> : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {usedList.map(([item, v]) => (
              <li key={item} className="flex justify-between gap-2">
                <span>{itemMap[item].name}</span>
                <b>{fmtNum(v)} {itemMap[item].unit}</b>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Pesanan terbaru</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-neutral-600">Belum ada pesanan. Nyalakan simulasi pelanggan atau catat transaksi manual.</p>
        ) : (
          <ol className="space-y-2">
            {orders.slice(0, 8).map((o) => (
              <li key={o.id} className="rounded-xl border border-gold/30 bg-cream p-2 text-sm">
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
                  <span>#{o.no} · {clock(o.at)}</span>
                  <span className="rounded-full border border-gold/40 px-2 py-0.5 font-semibold">{o.place}{o.pay ? ` · ${payLabel(o.pay)}` : ''}</span>
                </div>
                <p className="font-medium">{o.lines.map((l) => `${l.qty} ${l.name}`).join(' + ')}</p>
                <p className="font-semibold">{rupiah(o.total)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-xs text-neutral-600">DATA DEMO · varian dan takaran minuman adalah contoh. Data awal "Minuman Dingin" tidak dirinci per varian.</p>
    </section>
  );
}