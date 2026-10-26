import { useState } from 'react';
import { useStore, itemMap, products } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import { rupiah } from '../store/helpers.js';


const parse = (v) => parseFloat(String(v).replace(',', '.'));
const Msg = ({ m }) => m && (
  <p role="status" className={`text-sm font-semibold ${m.ok ? 'text-[#1E5B2A]' : 'text-marun'}`}>{m.ok ? '✓' : '✕'} {m.text}</p>
);

function StockForm({ loc, title }) {
  const stocks = useStore((s) => s.stocks);
  const adjust = useStore((s) => s.adjustStock);
  const list = Object.values(stocks).filter((s) => s.loc === loc);
  const [id, setId] = useState(list[0]?.id);
  const [mode, setMode] = useState('add');
  const [amt, setAmt] = useState('');
  const [msg, setMsg] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    const r = adjust({ id, mode, amount: parse(amt) });
    setMsg(r.ok ? { ok: true, text: 'Tercatat (otomatis disinkronkan saat online).' } : { ok: false, text: r.error });
    if (r.ok) setAmt('');
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <label className="block text-sm">Item
        <select className="input mt-1" value={id} onChange={(e) => setId(e.target.value)}>
          {list.map((s) => <option key={s.id} value={s.id}>{itemMap[s.item].name} ({itemMap[s.item].unit})</option>)}
        </select>
      </label>
      <div role="group" aria-label="Jenis perubahan" className="flex gap-2">
        {[['add', 'Tambah'], ['sub', 'Kurangi'], ['set', 'Setel']].map(([k, l]) => (
          <button type="button" key={k} aria-pressed={mode === k} onClick={() => setMode(k)} className={`pill flex-1 ${mode === k ? 'pill-active' : 'pill-ghost'}`}>{l}</button>
        ))}
      </div>
      <label className="block text-sm">Jumlah
        <input className="input mt-1" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} />
      </label>
      <button className="pill pill-primary w-full">Simpan stok</button>
      <Msg m={msg} />
    </form>
  );
}

function TransactionForm() {
  const add = useStore((s) => s.addTransaction);
  const [pid, setPid] = useState(products[0].id);
  const [qty, setQty] = useState('1');
  const [msg, setMsg] = useState(null);
  const p = products.find((x) => x.id === pid);
  const submit = (e) => {
    e.preventDefault();
    const r = add({ productId: pid, qty: parse(qty) });
    setMsg(r.ok ? { ok: true, text: `Transaksi ${rupiah(r.total)} tercatat.` } : { ok: false, text: r.error });
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <h3 className="font-semibold">Catat transaksi</h3>
      <label className="block text-sm">Produk
        <select className="input mt-1" value={pid} onChange={(e) => setPid(e.target.value)}>
          {products.map((x) => <option key={x.id} value={x.id}>{x.name} — {rupiah(x.price)}</option>)}
        </select>
      </label>
      <label className="block text-sm">Jumlah
        <input className="input mt-1" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
      </label>
      <p className="text-sm text-neutral-700">Total: <b>{rupiah(p.price * (parse(qty) || 0))}</b></p>
      <button className="pill pill-primary w-full">Catat transaksi</button>
      <Msg m={msg} />
    </form>
  );
}

export default function InputForms() {
  const perms = ROLES[useStore((s) => s.user).role];
  return (
    <section aria-labelledby="h-input" className="card space-y-5 p-4">
      <h2 id="h-input" className="font-display text-lg font-semibold">Input data</h2>
      <p className="text-xs text-neutral-600">Tetap bisa dicatat saat offline; antrean sinkron otomatis saat koneksi kembali.</p>
      {perms.forms.includes('transaksi') && <TransactionForm />}
      {perms.forms.includes('outlet') && <StockForm loc="outlet" title="Update stok Outlet" />}
      {perms.forms.includes('produksi') && <StockForm loc="produksi" title="Roti selesai dibuat (Unit Produksi)" />}
    </section>
  );
}