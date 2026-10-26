import { create } from 'zustand';
import seed from '../data/data.json';
import { kvGet, kvSet, queueAdd, queueCount } from './db.js';
import { ROLES } from './roles.js';
import { VIEWS, LAYOUT, GROUPS, AUTO } from '../scene/layout.js';
import { sid, fmtNum, statusOf } from './helpers.js';
import { reducedMotion } from '../scene/capability.js';
import { setGudang } from '../scene/serving.js';

// ---- Data turunan dari data.json ----
export const itemMap = Object.fromEntries(seed.items.map((i) => [i.id, i]));
export const roti = seed.items.filter((i) => i.kind === 'roti');
const bahan = seed.items.filter((i) => i.kind === 'bahan');
// Produk dasar: tiap roti + "Minuman Dingin" (agregat, dipakai ringkasan & data awal)
export const products = [
  ...roti.map((i) => ({ id: i.id, name: i.name, price: i.price, stockId: sid(i.id, 'outlet') })),
  { id: seed.drinkProduct.id, name: seed.drinkProduct.name, price: seed.drinkProduct.price, stockId: sid(seed.drinkProduct.consumes, 'outlet') },
];
export const DRINK_ID = seed.drinkProduct.id;
// Varian minuman: tiap penjualan mengurangi SEMUA bahan di resep (lokasi: outlet)
export const drinks = (seed.drinkVariants || []).map((v) => ({ id: v.id, name: v.name, price: seed.drinkProduct.price, recipe: v.recipe, color: v.color || '#9A6A45' }));
const drinkMap = Object.fromEntries(drinks.map((d) => [d.id, d]));
// Daftar produk di form transaksi manual
export const sellables = drinks.length ? [...products.filter((p) => p.id !== DRINK_ID), ...drinks] : products;

const SIM_BY = 'Simulasi (DATA DEMO)';

// Dampak 1 baris penjualan: stok apa yang berkurang, harga, dan kunci agregat "terjual"
const lineCost = (l) => {
  const d = drinkMap[l.productId];
  if (d) {
    return {
      name: d.name, price: d.price, soldKey: DRINK_ID, variant: d.id,
      uses: Object.entries(d.recipe).map(([item, per]) => ({ id: sid(item, 'outlet'), qty: per * l.qty })),
    };
  }
  const p = products.find((x) => x.id === l.productId);
  return p && { name: p.name, price: p.price, soldKey: p.id, uses: [{ id: p.stockId, qty: l.qty }] };
};

const seedStocks = () =>
  Object.fromEntries(seed.stocks.map((s) => {
    const id = sid(s.item, s.loc);
    return [id, { id, item: s.item, loc: s.loc, qty: s.qty, min: s.min, cap: s.cap, hist: [...s.hist], updatedAt: null, updatedBy: 'DATA DEMO' }];
  }));

const nowISO = () => new Date().toISOString();
// Perbarui jumlah + titik terakhir riwayat + jejak siapa/kapan
const touch = (s, qty, by) => {
  const q = Math.max(0, Math.round(qty * 100) / 100);
  return { ...s, qty: q, hist: [...s.hist.slice(0, -1), q], updatedAt: nowISO(), updatedBy: by };
};

// Rencana muatan truk:
//  - roti: dari stok Unit Produksi (nyata), sebanyak yang ada, maksimal sampai kapasitas Outlet terisi
//  - bahan: hanya yang status Rendah/Habis, diisi sampai kapasitas dari "gudang pusat" (DATA DEMO,
//    tidak ada stok bahan di produksi pada data.json, jadi pasokannya diasumsikan tak terbatas)
// stash = barang yang sudah di gudang Outlet tetapi belum masuk rak: dihitung agar truk tidak mengirim dobel
const planTransfers = (stocks, stash = []) => {
  const list = [];
  const pend = (item) => stash.reduce((a, t) => (t.item === item ? a + t.qty : a), 0);
  roti.forEach((i) => {
    const p = stocks[sid(i.id, 'produksi')], o = stocks[sid(i.id, 'outlet')];
    if (!p || !o) return;
    const qty = Math.min(p.qty, Math.max(0, o.cap - o.qty - pend(i.id)));
    if (qty > 0) list.push({ item: i.id, qty, src: 'produksi' });
  });
  bahan.forEach((i) => {
    const o = stocks[sid(i.id, 'outlet')];
    if (!o) return;
    const eff = o.qty + pend(i.id);
    if (statusOf({ ...o, qty: eff }) === 'ok') return;
    const qty = Math.round((o.cap - eff) * 100) / 100;
    if (qty > 0) list.push({ item: i.id, qty, src: 'gudang' });
  });
  return list;
};

// Hook agar sync.js bisa dipicu tanpa import melingkar
let flushHook = () => {};
export const setFlushHook = (fn) => { flushHook = fn; };

// Waktu truk terakhir selesai/berangkat (untuk jeda minimal antar pengiriman otomatis)
let lastDispatchEnd = 0;

export const useStore = create((set, get) => {
  const persist = () => {
    const { stocks, sold, soldDrink, orders, orderNo, delta, user, night, sim, stash } = get();
    kvSet('state', { v: seed.meta.version, stocks, sold, soldDrink, orders, orderNo, delta, user, night, sim, stash }).catch(() => {});
  };
  // Catat setiap perubahan ke antrean sinkronisasi (offline-first)
  const log = async (type, payload) => {
    const op = { type, payload, by: get().user?.name ?? '-', at: nowISO() };
    try { await queueAdd(op); set({ pending: await queueCount() }); } catch { set((s) => ({ pending: s.pending + 1 })); }
    persist();
    if (navigator.onLine) flushHook();
  };
  const toast = (msg) => set((s) => ({ toast: { msg, n: (s.toast?.n ?? 0) + 1 } }));

  // Satu-satunya tempat stok & penjualan dihitung (dipakai simulasi DAN form manual).
  // Mengembalikan state baru tanpa menyimpannya; pemanggil yang melakukan set().
  const settle = (lines, by) => {
    const { stocks, sold, soldDrink } = get();
    const next = { ...stocks }, ns = { ...sold }, nd = { ...soldDrink };
    const names = [];
    let omzet = 0;
    for (const l of lines) {
      const c = lineCost(l);
      if (!c) return { ok: false, error: 'Produk tidak dikenal.' };
      for (const u of c.uses) {
        const s = next[u.id];
        if (!s) return { ok: false, error: 'Stok bahan tidak ditemukan.' };
        if (s.qty + 1e-9 < u.qty) return { ok: false, error: `Stok ${itemMap[s.item].name} di outlet tidak cukup (tersisa ${fmtNum(s.qty)}).` };
        next[u.id] = touch(s, s.qty - u.qty, by);
      }
      ns[c.soldKey] = (ns[c.soldKey] || 0) + l.qty;
      if (c.variant) nd[c.variant] = (nd[c.variant] || 0) + l.qty;
      omzet += c.price * l.qty;
      names.push(c.name);
    }
    return { ok: true, next, ns, nd, omzet, names };
  };

  return {
    ready: false, user: null,
    stocks: {}, sold: {}, soldDrink: {}, orders: [], orderNo: 0, delta: { omzet: 0, trx: 0 },
    selected: null, view: 'overview', cam: { ...VIEWS.overview, n: 0 },
    night: false, sim: true, roof: 'ghost', toast: null,
    online: true, pending: 0, lastSynced: null,
    stash: [], // barang di gudang Outlet yang belum masuk rak: { id, item, qty, src, by, ready }
    delivery: { phase: 'idle', stage: 'idle', transfers: [], auto: false },

    // ---- Inisialisasi: muat dari IndexedDB, kalau kosong pakai data.json ----
    init: async () => {
      let saved = null; let pending = 0;
      try { saved = await kvGet('state'); pending = await queueCount(); } catch {}
      if (saved && saved.v !== seed.meta.version) saved = null; // data.json diganti -> reset
      const home = saved?.user ? ROLES[saved.user.role].home : 'overview';
      set({
        stocks: saved?.stocks ?? seedStocks(),
        sold: saved?.sold ?? { ...seed.sales.today.items },
        soldDrink: saved?.soldDrink ?? {},
        orders: saved?.orders ?? [],
        orderNo: saved?.orderNo ?? 0,
        delta: saved?.delta ?? { omzet: 0, trx: 0 },
        stash: (saved?.stash ?? []).map((t) => ({ ...t, ready: true })), // setelah muat ulang, barang di gudang siap diambil
        user: saved?.user ?? null, night: saved?.night ?? false,
        sim: saved?.sim ?? !reducedMotion(), // pengguna "reduced motion" mulai dengan simulasi mati
        view: home, cam: { ...VIEWS[home], n: 0 }, pending, online: navigator.onLine, ready: true,
      });
    },

    // ---- Auth demo (ganti dengan Supabase/Firebase Auth) ----
    login: (userId, pin) => {
      const u = seed.users.find((x) => x.id === userId);
      if (!u || u.pin !== pin) return false;
      const home = ROLES[u.role].home;
      set({ user: { id: u.id, name: u.name, role: u.role }, view: home, cam: { ...VIEWS[home], n: 0 }, selected: null });
      persist();
      return true;
    },
    logout: () => { set({ user: null, selected: null }); persist(); },

    // ---- Kamera & seleksi ----
    setView: (v) => set((s) => ({ view: v, selected: null, cam: { ...VIEWS[v], n: s.cam.n + 1 } })),
    select: (sel) => {
      if (!sel) return set({ selected: null });
      const { user, stocks } = get();
      const loc = sel.type === 'stock' ? stocks[sel.id]?.loc : GROUPS[sel.id]?.loc;
      if (!loc || !ROLES[user.role].zones.includes(loc)) return; // di luar hak akses
      const pos = sel.type === 'stock' ? LAYOUT[sel.id]?.pos : GROUPS[sel.id].pos;
      set((s) => ({
        selected: sel,
        cam: pos ? { look: [pos[0], pos[1] + 0.7, pos[2]], dir: [0.45, 0.75, 1], dist: 8, n: s.cam.n + 1 } : s.cam,
      }));
    },
    toggleNight: () => { set((s) => ({ night: !s.night })); persist(); },
    cycleRoof: () => set((s) => ({ roof: s.roof === 'ghost' ? 'solid' : s.roof === 'solid' ? 'off' : 'ghost' })),
    setOnline: (online) => set({ online }),

    // ---- Input stok manual (tambah / kurangi / setel) ----
    adjustStock: ({ id, mode, amount }) => {
      const { stocks, user } = get();
      const s = stocks[id];
      if (!s) return { ok: false, error: 'Item tidak ditemukan.' };
      if (!ROLES[user.role].forms.includes(s.loc)) return { ok: false, error: 'Peran Anda tidak boleh mengubah stok ini.' };
      if (!Number.isFinite(amount) || amount < 0 || (mode !== 'set' && amount === 0)) return { ok: false, error: 'Masukkan jumlah yang valid.' };
      const q = mode === 'add' ? s.qty + amount : mode === 'sub' ? s.qty - amount : amount;
      if (q < 0) return { ok: false, error: `Stok tidak cukup (tersisa ${s.qty}).` };
      set({ stocks: { ...stocks, [id]: touch(s, q, user.name) } });
      log('stock.adjust', { id, mode, amount, qty: q });
      return { ok: true };
    },

    // ---- Transaksi penjualan outlet (form manual) ----
    addTransaction: ({ productId, qty }) => {
      const { user, delta } = get();
      if (!ROLES[user.role].forms.includes('transaksi')) return { ok: false, error: 'Tidak diizinkan.' };
      if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Masukkan jumlah yang valid.' };
      const r = settle([{ productId, qty }], user.name);
      if (!r.ok) return r;
      set({ stocks: r.next, sold: r.ns, soldDrink: r.nd, delta: { omzet: delta.omzet + r.omzet, trx: delta.trx + 1 } });
      get().recordOrder({ by: user.name, lines: [{ name: r.names[0], qty }], total: r.omzet, place: 'Kasir (manual)' });
      log('transaction', { productId, qty, total: r.omzet });
      return { ok: true, total: r.omzet };
    },

    // ---- Riwayat pesanan (30 terbaru) ----
    recordOrder: ({ by, lines, total, place, pay }) => {
      const no = get().orderNo + 1;
      set((s) => ({
        orderNo: no,
        orders: [{ id: `${Date.now()}-${no}`, no, at: nowISO(), by, lines, total, place, pay }, ...s.orders].slice(0, 30),
      }));
      persist();
    },

    // ---- Simulasi ----
    toggleSim: () => { set((s) => ({ sim: !s.sim })); persist(); },

    // Penjualan simulasi: stok + omzet + transaksi demo (resep minuman ikut mengurangi bahan).
    // SENGAJA tidak masuk antrean sinkronisasi (data simulasi tidak boleh terkirim ke backend).
    simulateSale: ({ lines, countTrx = true }) => {
      const r = settle(lines, 'Simulasi pelanggan (DATA DEMO)');
      if (!r.ok) return { ok: false };
      const { delta } = get();
      set({ stocks: r.next, sold: r.ns, soldDrink: r.nd, delta: { omzet: delta.omzet + r.omzet, trx: delta.trx + (countTrx ? 1 : 0) } });
      persist();
      return { ok: true, total: r.omzet };
    },

    // Produksi simulasi: pembakar meletakkan satu loyang di rak Unit Produksi.
    // Mengembalikan jumlah roti yang benar-benar ditambahkan (dibatasi kapasitas rak).
    // Tidak masuk antrean sinkronisasi (data simulasi).
    produceBatch: (itemId, qty) => {
      const { stocks } = get();
      const s = stocks[sid(itemId, 'produksi')];
      if (!s) return 0;
      const add = Math.min(qty, Math.max(0, s.cap - s.qty));
      if (add <= 0) return 0;
      set({ stocks: { ...stocks, [s.id]: touch(s, s.qty + add, 'Produksi (simulasi, DATA DEMO)') } });
      persist();
      return add;
    },

    // Kembalikan stok, penjualan, dan riwayat pesanan ke data.json
    resetDemo: () => {
      set({ stocks: seedStocks(), sold: { ...seed.sales.today.items }, soldDrink: {}, orders: [], orderNo: 0, delta: { omzet: 0, trx: 0 }, selected: null, stash: [] });
      setGudang([]);
      persist();
      toast('Data demo dikembalikan ke awal.');
    },

    // ---- FR-05: Kirim stok Produksi -> Outlet ----
    // Manual (tombol) atau otomatis (autoDispatch). instant = mode 2D tanpa animasi.
    sendToOutlet: ({ instant = false, auto = false } = {}) => {
      const { stocks, delivery, user, view, stash } = get();
      if (delivery.phase !== 'idle') return;
      if (!auto && !ROLES[user.role].canSend) return;
      const transfers = planTransfers(stocks, stash);
      if (!transfers.length) return auto ? undefined : toast('Tidak ada yang perlu dikirim (produksi kosong, atau Outlet penuh dan bahan masih aman).');
      set({ delivery: { phase: 'moving', stage: 'load', transfers, auto } });
      if (instant) { get().completeDelivery({ direct: true }); get().finishDelivery(); return; } // mode 2D tanpa animasi
      // Agar seluruh rute terlihat, pindahkan kamera ke tampilan "Semua" (hanya untuk kirim manual)
      if (!auto && view !== 'overview' && view !== 'top') get().setView('overview');
    },

    // Pengiriman otomatis: dipanggil berkala oleh useAutoDispatch.
    // Berangkat bila ada stok Outlet yang memenuhi AUTO.trigger DAN truk benar-benar bisa memasoknya.
    autoDispatch: () => {
      const { sim, user, delivery, stocks, stash } = get();
      if (!sim || !user || delivery.phase !== 'idle') return;
      if (Date.now() - lastDispatchEnd < AUTO.cooldown * 1000) return;
      const need = Object.values(stocks).filter((s) =>
        s.loc === 'outlet' && (AUTO.trigger === 'low' ? statusOf(s) !== 'ok' : s.qty <= 0));
      if (!need.length) return;
      const transfers = planTransfers(stocks, stash);
      const served = need.filter((s) => transfers.some((t) => t.item === s.item));
      if (!served.length) return; // belum ada yang bisa dikirim (mis. roti produksi masih kosong, atau sudah menunggu di gudang)
      lastDispatchEnd = Date.now();
      set({ delivery: { phase: 'moving', stage: 'load', transfers, auto: true } });
      const names = served.slice(0, 2).map((s) => itemMap[s.item].name).join(', ');
      const more = served.length > 2 ? ` +${served.length - 2} lainnya` : '';
      toast(`Stok ${AUTO.trigger === 'low' ? 'rendah' : 'habis'}: ${names}${more}. Truk produksi berangkat otomatis.`);
    },

    // Dipanggil sopir saat peti diturunkan di dok Outlet. Stok Produksi berkurang di sini.
    // direct = true (mode 2D / scene ditutup): stok Outlet langsung naik.
    // direct = false: barang masuk gudang Outlet (stash); stok Outlet naik saat pegawai pengisi menaruhnya di rak (restockOutlet).
    completeDelivery: ({ direct = false } = {}) => {
      const { stocks, delivery } = get();
      const by = delivery.auto ? SIM_BY : (get().user?.name ?? SIM_BY);
      const next = { ...stocks };
      const moved = [];
      let bread = 0, supplies = 0;
      delivery.transfers.forEach((t, i) => {
        const o = next[sid(t.item, 'outlet')];
        if (!o) return;
        let qty = t.qty;
        if (t.src === 'produksi') {
          const p = next[sid(t.item, 'produksi')];
          if (!p) return;
          qty = Math.min(qty, p.qty); // stok produksi bisa berubah selama perjalanan
          next[p.id] = touch(p, p.qty - qty, by);
          bread += qty;
        } else supplies += 1;
        if (direct) next[o.id] = touch(o, o.qty + qty, by);
        else if (qty > 0) moved.push({ id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, item: t.item, qty, src: t.src, by, ready: false });
      });
      set((s) => ({ stocks: next, stash: direct ? s.stash : [...s.stash, ...moved] }));
      if (delivery.auto) persist(); // data simulasi: tidak masuk antrean sinkronisasi
      else log('stock.transfer', { transfers: delivery.transfers });
      const parts = [bread > 0 && `${fmtNum(bread)} roti`, supplies > 0 && `${supplies} bahan`].filter(Boolean).join(' + ');
      toast(direct ? `${parts || 'Muatan'} terkirim ke Outlet.` : `${parts || 'Muatan'} tiba di gudang Outlet.`);
    },

    // Pegawai penerima sudah meletakkan peti di gudang -> barang boleh diambil pegawai pengisi rak
    readyStash: () => {
      if (!get().stash.some((t) => !t.ready)) return;
      set((s) => ({ stash: s.stash.map((t) => (t.ready ? t : { ...t, ready: true })) }));
      persist();
    },

    // Pegawai pengisi rak menaruh barang dari gudang ke rak Outlet: angka stok Outlet naik di sini.
    // ids = entri tertentu (kosong = semua). Mengembalikan jumlah entri yang dipindahkan.
    restockOutlet: (ids) => {
      const { stocks, stash } = get();
      const pick = stash.filter((t) => !ids || ids.includes(t.id));
      if (!pick.length) return 0;
      const next = { ...stocks };
      let bread = 0, supplies = 0;
      pick.forEach((t) => {
        const o = next[sid(t.item, 'outlet')];
        if (!o) return;
        next[o.id] = touch(o, Math.min(o.cap, o.qty + t.qty), t.by || SIM_BY);
        if (t.src === 'produksi') bread += t.qty; else supplies += 1;
      });
      set({ stocks: next, stash: stash.filter((t) => !pick.includes(t)) });
      persist(); // data simulasi / sudah tercatat saat pengiriman: tidak masuk antrean sinkronisasi lagi
      const parts = [bread > 0 && `${fmtNum(bread)} roti`, supplies > 0 && `${supplies} bahan`].filter(Boolean).join(' + ');
      toast(`${parts || 'Muatan'} masuk ke rak Outlet.`);
      return pick.length;
    },

    // Dipanggil sopir saat peti diturunkan di dok Outlet: angka kedua lokasi berubah bersamaan
    completeDelivery: () => {
      const { stocks, delivery } = get();
      const by = delivery.auto ? SIM_BY : (get().user?.name ?? SIM_BY);
      const next = { ...stocks };
      let bread = 0, supplies = 0;
      delivery.transfers.forEach((t) => {
        const o = next[sid(t.item, 'outlet')];
        if (!o) return;
        let qty = t.qty;
        if (t.src === 'produksi') {
          const p = next[sid(t.item, 'produksi')];
          if (!p) return;
          qty = Math.min(qty, p.qty); // stok produksi bisa berubah selama perjalanan
          next[p.id] = touch(p, p.qty - qty, by);
          bread += qty;
        } else supplies += 1;
        next[o.id] = touch(o, o.qty + qty, by);
      });
      set({ stocks: next });
      if (delivery.auto) persist(); // data simulasi: tidak masuk antrean sinkronisasi
      else log('stock.transfer', { transfers: delivery.transfers });
      const parts = [bread > 0 && `${fmtNum(bread)} roti`, supplies > 0 && `${supplies} bahan`].filter(Boolean).join(' + ');
      toast(`${parts || 'Muatan'} terkirim ke Outlet.`);
    },
    finishDelivery: () => {
      lastDispatchEnd = Date.now();
      set({ delivery: { phase: 'idle', stage: 'idle', transfers: [], auto: false } });
    },
    setDeliveryStage: (stage) => set((s) => ({ delivery: { ...s.delivery, stage } })),
  };
});