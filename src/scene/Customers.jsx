import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore, roti, drinks } from '../store/useStore.js';
import { canSeeLoc } from '../store/roles.js';
import { sid, rupiah } from '../store/helpers.js';
import { LAYOUT, SIM, STATIONS, LANES, DOORSENS, GUDANG, PICKUP, PAYMENT, OUTLET, DOOR } from './layout.js';
import { SEATS, seatMess, bar as barState } from './serving.js';
import Person from '../objects/Person.jsx';
import {
  PI, HALF, WALK, rand, pick, mkEntity, follow, applyPose, runTasks, say,
  separate, crowdAdd, crowdDel, doorReport, wantsDoor,
} from './actors.js';
import { clockRate, tickClock } from './simClock.js';
import { metricsArrival, metricsServed, metricsLost, metricsDrink, metricsFrame } from './simMetrics.js';
import { pickMethod, cashFor, payOpen, payUpdate, payClose, payServe, payRelease, payRecord, payClearLive } from './payments.js';
import { povSrc, stopPov } from './pov.js';

/* ============ Simulasi pelanggan + 2 kasir + barista + petugas kebersihan (visual + transaksi demo) ============
   Pelanggan: masuk lewat pintu -> pilih antrean -> pesan -> kasir bertanya metode bayar -> pelanggan memilih otomatis
              (tunai / QRIS / kartu) -> kasir menerima sesuai metode -> terima roti -> (bila ada minuman)
              menunggu & mengambil minuman di meja Bar Kopi -> duduk (dalam / halaman) atau bawa pulang -> pergi
   Kasir 1/2: keduanya menerima pesanan roti + minuman; roti diambil dari bay etalase di zona masing-masing
   Barista  : mulai setelah pembayaran: ambil cup -> seduh (stok bahan berkurang) -> taruh gelas di meja bar
   Kebersihan: keluar dari gudang (di sebelah dok bongkar), membereskan meja kotor, kembali ke gudang
   Meja kotor: piring/gelas bekas tinggal di kursi sampai dibersihkan; kursi itu tidak bisa dipakai pelanggan baru
   Pembayaran: payments.js (DATA DEMO, hanya di memori). POV kasir/pelanggan: pov.js membaca entitas dari sini.
   Lalu lintas: tiap arah punya lajur sendiri (layout.js -> LANES); rem otomatis & pemisah ada di actors.js.
   Jam & metrik: simClock.js, simMetrics.js (DATA DEMO, tidak disinkronkan).
   Transaksi dicatat lewat store.simulateSale() tepat saat barang diambil / minuman selesai diseduh. */

const POOL = 8; // maksimum pelanggan di scene (dua antrean + yang menunggu minuman + yang makan di tempat)

const SHIRTS = ['#6B7A8F', '#8FA58A', '#C98B6B', '#7E6B8F', '#D6C28A', '#5E8C8A', '#B05A5A', '#4F6D9C'];
const PANTS = ['#2F3A4A', '#3D3A36', '#4A5A6A', '#5B4636', '#222222'];
const SKINS = ['#F0C9A4', '#E0AC84', '#C68B62', '#9A6A48', '#6F4A33'];
const HAIRS = ['#151515', '#2B1B12', '#4A3020', '#7A5A38', '#B58B4C'];
const CHOOSE_SAY = { tunai: 'Tunai aja ya', qris: 'Pakai QRIS ya', kartu: 'Pakai kartu ya' };

/* ---------- Jalur berlajur ----------
   Arah timur (kanan) dan barat (kiri) memakai lajur berbeda, jadi tidak ada yang berhadapan di garis yang sama. */
const EXIT = SIM.doorOutX; // lajur keluar pintu (x)
const DOOR_IN = SIM.doorInX;
const IN_E = LANES.inE, IN_W = LANES.inW;
const isYard = (seat) => seat.z > SIM.outLaneZ;
// Dari posisi x (dalam Outlet atau kursi) menuju pintu keluar lalu trotoar arah timur
function leavePath(x, outdoor) {
  const lz = outdoor ? (x < EXIT ? LANES.yardE : LANES.yardW) : (x <= EXIT ? IN_E : IN_W);
  return [[x, lz], [EXIT, lz], [EXIT, LANES.walkE], [SIM.exitX, LANES.walkE]];
}
// Dari kepala antrean / meja bar ke kursi
function toSeatPath(c, seat) {
  if (isYard(seat)) { // meja halaman: keluar lewat lajur keluar pintu, lalu lajur halaman
    const yz = seat.x >= EXIT ? LANES.yardE : LANES.yardW;
    return [[c.x, IN_E], [EXIT, IN_E], [EXIT, yz], [seat.x, yz], [seat.x, seat.z]];
  }
  const lz = seat.x >= c.x ? IN_E : IN_W;
  return [[c.x, lz], [seat.x, lz], [seat.x, seat.z]];
}

/* ---------- Stasiun & pesanan ---------- */
const bayOf = (id) => LAYOUT[sid(id, 'outlet')]?.pos[0];
// Roti boleh diambil stasiun ini bila bay-nya ada di zonanya (item tanpa bay di layout boleh di mana saja)
const inZone = (st, id) => { const x = bayOf(id); return x === undefined || (x >= st.zone[0] && x <= st.zone[1]); };
const breadFor = (stocks, st) => roti.filter((i) => (stocks[sid(i.id, 'outlet')]?.qty ?? 0) >= 1 && inZone(st, i.id));

// Pilih antrean terpendek. Pesanan berisi roti diutamakan ke stasiun yang etalasenya masih ada stok. null = antrean penuh.
function pickStation(S, want) {
  let open = S.stations.filter((s) => s.queue.length < s.queueX.length);
  if (want.drink) open = open.filter((s) => s.drinks);
  if (!open.length) return null;
  let pool = open;
  if (want.bread) {
    const stocks = useStore.getState().stocks;
    const stocked = open.filter((s) => breadFor(stocks, s).length > 0);
    if (stocked.length) pool = stocked;
  }
  return pool.reduce((a, b) => (b.queue.length < a.queue.length ? b : a));
}

function makeOrder(stocks, st, want) {
  const avail = breadFor(stocks, st);
  // Minuman hanya di stasiun minuman, dan hanya bila SEMUA bahan resepnya cukup
  const okDrinks = st.drinks ? drinks.filter((d) =>
    Object.entries(d.recipe).every(([item, per]) => (stocks[sid(item, 'outlet')]?.qty ?? 0) + 1e-9 >= per)) : [];
  let wantBread = want.bread, wantDrink = want.drink && st.drinks;
  if (!avail.length) wantBread = false;
  if (!okDrinks.length) wantDrink = false;
  if (!wantBread && !wantDrink) { // pilihan awal tidak tersedia -> coba yang masih ada
    wantBread = avail.length > 0; wantDrink = okDrinks.length > 0;
    if (!wantBread && !wantDrink) return null; // semua habis
  }
  let bread = null, drink = null, total = 0;
  if (wantBread) {
    const it = pick(avail), have = stocks[sid(it.id, 'outlet')].qty;
    const qty = Math.min(Math.floor(have), Math.random() < 0.3 ? 2 : 1);
    bread = { id: it.id, name: it.name, qty, bayX: bayOf(it.id) ?? st.serveX };
    total += it.price * qty;
  }
  if (wantDrink) { drink = pick(okDrinks); total += drink.price; }
  return { bread, drink, total };
}

/* ---------- Staf ---------- */
const BACK_Z = SIM.staffZ - 0.35;
// Rute kasir lewat lorong staf (z = staffZ) supaya tidak menembus konter
function route(from, to) {
  const pts = [];
  if (from[1] < BACK_Z) pts.push([from[0], SIM.staffZ]);
  if (to[1] < BACK_Z) pts.push([to[0], SIM.staffZ]);
  pts.push(to);
  return pts;
}

// Kepala antrean mulai dilayani -> susun tugas kasir stasiun itu (dan barista bila ada minuman)
function startService(S, st, c) {
  const K = st.K, B = S.B, T = K.tasks;
  c.state = 'ordering';
  c.waitQ = c.tQ !== undefined ? S.t - c.tQ : 0; // lama menunggu di antrean (metrik)
  c.tServe = S.t; c.hadOrder = false;
  let order = makeOrder(useStore.getState().stocks, st, c.want);
  // Minuman butuh satu slot di meja bar; bila penuh, minuman dilepas dari pesanan
  const slot = order && order.drink ? S.slots.find((s) => !s.owner) : null;
  if (order && order.drink && !slot) {
    const price = order.drink.price;
    order = order.bread ? { ...order, drink: null, total: order.total - price } : null;
  }
  if (!order) {
    T.push({
      k: 'do', d: 2.4, anim: 'talk', face: 0,
      start: () => { say(S, c, 'Yah, habis semua…', 2.2); say(S, K, 'Mohon maaf, stok sedang habis', 2.2); },
      end: () => finish(S, c),
    });
    return;
  }
  c.hadOrder = true;
  if (slot) { slot.owner = c; slot.ready = false; barState.ready[slot.i] = false; c.slot = slot; }

  // Makan di tempat (kursi dipesan dari sekarang; kursi kotor tidak bisa dipakai) atau dibungkus
  const free = S.seats.filter((s) => !s.taken && !s.dirty);
  c.dine = free.length > 0 && Math.random() < 0.7;
  if (c.dine) { c.seat = pick(free); c.seat.taken = true; }

  const text = [order.bread && `${order.bread.qty} ${order.bread.name}`, order.drink && order.drink.name].filter(Boolean).join(' + ');
  let counted = false; // transaksi dihitung sekali per pelanggan
  c.order = { lines: [], total: 0 }; // yang BENAR-BENAR terjual (dicatat ke riwayat saat selesai)
  c.paid = false; c.drinkDone = !order.drink; c.drinkOk = false;
  const sell = (productId, qty, name) => {
    const r = useStore.getState().simulateSale({ lines: [{ productId, qty }], countTrx: !counted });
    if (r.ok) { counted = true; c.order.lines.push({ name, qty }); c.order.total += r.total; }
    return r.ok;
  };

  // Pembayaran (DATA DEMO): metode dipilih pelanggan secara otomatis saat kasir bertanya
  const M = pickMethod();
  c.pay = M;
  const given = M === 'tunai' ? cashFor(order.total) : 0;
  const change = given ? given - order.total : 0;
  payOpen(c.uid, { stationId: st.id, total: order.total, text, drink: !!order.drink, dine: c.dine });
  payServe(st.id, c.uid);
  const upd = (p) => payUpdate(c.uid, p);

  // Barista (paralel): dimulai tepat saat pembayaran selesai, menaruh gelas di meja bar
  const queueDrink = () => {
    const D = order.drink, sl = slot;
    const stand = [SIM.baristaX, SIM.baristaZ];
    const give = [sl.stand[0], SIM.baristaZ + 0.1]; // di belakang pulau, sejajar slot
    B.tasks.push(
      { k: 'do', d: 1.0, anim: 'talk', face: 0, start: () => say(S, B, `Siap, ${D.name}!`, 1.4) },
      { k: 'walk', to: [SIM.cupX, SIM.cupZ], face: PI },
      { k: 'do', d: 0.9, anim: 'reachHigh', face: PI, end: () => { B.holdCup = true; } },
      { k: 'walk', to: stand, face: 0 },
      {
        // Bahan (kopi, susu, dst.) dan cup berkurang saat penyeduhan selesai
        k: 'do', d: 2.6, anim: 'brew', face: 0,
        start: () => say(S, B, `Menyeduh ${D.name}…`, 2.4),
        end: () => {
          if (c.slot !== sl) { B.holdCup = false; return; } // pelanggan sudah pergi
          if (!sell(D.id, 1, D.name)) { B.holdCup = false; c.drinkDone = true; c.drinkOk = false; }
        },
      },
      { k: 'walk', to: give, face: 0 },
      {
        k: 'do', d: 0.8, anim: 'hand', face: 0,
        start: () => say(S, B, 'Silakan!', 1.0),
        end: () => {
          if (B.holdCup && c.slot === sl) { sl.ready = true; barState.ready[sl.i] = true; barState.color[sl.i] = D.color; c.drinkColor = D.color; c.drinkOk = true; c.drinkDone = true; }
          B.holdCup = false;
        },
      },
      { k: 'walk', to: stand, face: 0 },
    );
  };

  // Pembayaran diterima kasir
  const paid = () => {
    c.paid = true; c.tPaid = S.t;
    upd({ phase: 'done', step: '' });
    if (order.drink) queueDrink();
  };

  // Langkah penerimaan menurut metode
  const payTasks = M === 'tunai' ? [
    { k: 'do', d: 1.1, anim: 'hand', face: 0, start: () => { upd({ step: 'give' }); say(S, K, `Terima ${rupiah(given)}`, 1.2); } },
    {
      k: 'do', d: 1.2, anim: 'ring', face: PI,
      start: () => { upd({ step: 'change' }); say(S, K, change > 0 ? `Kembalian ${rupiah(change)}` : 'Uang pas, terima kasih', 1.3); },
      end: paid,
    },
  ] : M === 'qris' ? [
    { k: 'do', d: 1.4, anim: 'ring', face: PI, start: () => { upd({ step: 'scan' }); say(S, K, 'Silakan scan QRIS', 1.4); } },
    { k: 'do', d: 0.9, anim: 'ring', face: PI, start: () => { upd({ step: 'confirm' }); say(S, K, 'QRIS masuk, terima kasih', 1.2); }, end: paid },
  ] : [
    { k: 'do', d: 1.2, anim: 'ring', face: PI, start: () => { upd({ step: 'tap' }); say(S, K, 'Silakan tap kartunya', 1.3); } },
    { k: 'do', d: 1.0, anim: 'ring', face: PI, start: () => { upd({ step: 'confirm' }); say(S, K, 'Kartu disetujui', 1.1); }, end: paid },
  ];

  // --- Kasir: pesan -> tanya metode -> bayar -> ambil roti -> serahkan roti (minuman diambil sendiri di bar) ---
  T.push(
    { k: 'do', d: 2.2, anim: 'talk', face: 0, start: () => say(S, c, `Mau ${text}, ${c.dine ? 'dine in' : 'dibungkus ya'}`, 2.1) },
    { k: 'walk', to: [st.registerX, SIM.staffZ], face: PI },
    {
      k: 'do', d: PAYMENT.chooseSecs, anim: 'ring', face: PI,
      start: () => { say(S, K, `Total ${rupiah(order.total)}. Bayar pakai apa?`, PAYMENT.chooseSecs + 0.1); upd({ phase: 'choosing' }); },
      end: () => { upd({ phase: 'paying', method: M, given, change, step: '' }); say(S, c, CHOOSE_SAY[M], 1.4); },
    },
    ...payTasks,
  );
  if (order.bread) T.push(
    { k: 'walk', to: [order.bread.bayX, SIM.staffZ], face: 0 },
    { k: 'do', d: 1.1, anim: 'reachLow', face: 0, end: () => { if (sell(order.bread.id, order.bread.qty, order.bread.name)) K.holdBread = true; } },
  );
  T.push({ k: 'walk', to: [st.serveX, SIM.staffZ], face: 0 });

  const give = () => {
    if (c.dine) { c.holdBread = K.holdBread; K.holdBread = false; }
    else { c.bag = K.bag; K.bag = null; }
    const got = c.dine ? c.holdBread : (c.bag && c.bag.bread);
    if (got) say(S, c, 'Terima kasih!', 1.6);
    finish(S, c);
  };
  if (order.bread) {
    if (!c.dine) T.push({
      // Bawa pulang: roti dimasukkan ke paper bag dulu (gelas menyusul dari bar)
      k: 'do', d: 1.5, anim: 'pack', face: 0,
      start: () => say(S, K, 'Dibungkus dulu ya…', 1.4),
      end: () => { K.bag = { bread: K.holdBread, cup: false }; K.holdBread = false; },
    });
    T.push({ k: 'do', d: 1.3, anim: 'hand', face: 0, start: () => say(S, K, 'Silakan, pesanannya!', 1.2), end: give });
  } else {
    T.push({ k: 'do', d: 1.0, anim: 'talk', face: 0, start: () => say(S, K, 'Minumannya di Bar Kopi ya', 1.6), end: give });
  }
}

// Kasir selesai melayani: pelanggan keluar dari antrean, lalu ke bar (bila ada minuman) atau langsung selesai
function finish(S, c) {
  c.st.queue = c.st.queue.filter((q) => q !== c);
  payRelease(c.st.id, c.uid);
  if (c.tServe !== undefined) { // metrik antrean: waktu layanan kasir (tanpa menunggu minuman)
    if (c.hadOrder) metricsServed(c.st.id, c.waitQ ?? 0, S.t - c.tServe); else metricsLost(c.st.id);
    c.tServe = undefined;
  }
  if (c.slot) goBar(S, c); else completeOrder(S, c);
}

// Menuju slot ambil minuman: lewat lajur timur dalam
function goBar(S, c) {
  const sl = c.slot;
  c.state = 'toBar';
  c.path = [[c.x, IN_E], [sl.stand[0], IN_E], [sl.stand[0], sl.stand[1]]];
  c.onArrive = () => { c.state = 'waitDrink'; c.tWait = S.t; c.targetFace = PI; };
}

// Minuman diambil (ok) atau pelanggan menyerah / minuman gagal dibuat (!ok)
function takeDrink(S, c, ok) {
  const sl = c.slot;
  if (sl) { sl.ready = false; sl.owner = null; barState.ready[sl.i] = false; }
  c.slot = null; c.anim = null;
  if (ok) {
    if (c.drinkColor) c.rig.mats?.drink?.color.set(c.drinkColor); // isi gelas mengikuti varian
    if (c.dine) c.holdCup = true;
    else c.bag = { bread: !!(c.bag && c.bag.bread), cup: true };
    metricsDrink(S.t - (c.tPaid ?? S.t)); // waktu minuman: dari bayar sampai diterima pelanggan
    say(S, c, 'Terima kasih!', 1.4);
  }
  completeOrder(S, c);
}

// Pesanan lengkap: catat riwayat (+ metode bayar), lalu duduk (makan di tempat) atau pergi membawa bungkusan
function completeOrder(S, c) {
  const got = c.dine ? (c.holdBread || c.holdCup) : (c.bag && (c.bag.bread || c.bag.cup));
  const dine = !!(got && c.dine && c.seat);
  if (c.order && c.order.lines.length) {
    useStore.getState().recordOrder({
      by: 'Simulasi pelanggan', lines: c.order.lines, total: c.order.total,
      place: dine ? 'Dine In' : 'Bawa pulang', pay: c.pay,
    });
    if (c.pay) payRecord(c.pay, c.order.total, c.st?.id, useStore.getState().orderNo);
  }
  if (dine) {
    const seat = c.seat;
    c.hasTray = true; c.plate = !!c.holdBread; // nampan tetap di meja sampai pelanggan berdiri
    c.state = 'toSeat';
    c.path = toSeatPath(c, seat);
    c.onArrive = () => { c.state = 'sitting'; c.sitTarget = 1; c.targetFace = seat.face; c.sitTotal = c.timer = rand(14, 22); };
  } else {
    if (c.seat) { c.seat.taken = false; c.seat = null; } // kursi yang dipesan dilepas lagi
    c.holdBread = c.holdCup = false; c.hasTray = false; c.plate = false;
    c.state = 'leaving';
    c.path = leavePath(c.x, false);
    c.onArrive = () => despawn(S, c);
  }
}

function despawn(S, c) {
  S.people = S.people.filter((p) => p !== c);
  if (c.st) c.st.queue = c.st.queue.filter((p) => p !== c);
  if (c.seat) c.seat.taken = false;
  if (c.slot) { c.slot.owner = null; c.slot.ready = false; barState.ready[c.slot.i] = false; c.slot = null; }
  payClose(c.uid);
  crowdDel(c);
  c.rig.busy = false;
  c.rig.setSay?.(null);
  if (c.rig.root) c.rig.root.visible = false;
}

function spawn(S, rigs) {
  const rig = rigs.find((r) => !r.busy);
  if (!rig) return false;
  // Pesanan dipilih saat datang (komposisi: 30% minuman, 35% roti, 35% keduanya)
  const r = Math.random();
  const want = { bread: r >= 0.3, drink: r < 0.3 || r >= 0.65 };
  const st = pickStation(S, want);
  if (!st) return false; // antrean yang dituju penuh
  rig.busy = true;
  const m = rig.mats;
  m.shirt.color.set(pick(SHIRTS)); m.pants.color.set(pick(PANTS));
  m.skin.color.set(pick(SKINS)); m.hair.color.set(pick(HAIRS));
  m.drink.color.set('#9A6A45');
  const c = mkEntity(rig, SIM.spawnX, LANES.walkW, -HALF); // muncul di trotoar (lajur arah barat), masuk lewat pintu
  c.speed = WALK * rand(0.92, 1.12);
  c.state = 'walkIn';
  c.st = st; c.want = want; c.slot = null;
  const k = st.queue.length;
  c.path = [
    [SIM.doorInX, LANES.walkW], [SIM.doorInX, IN_W],
    [st.queueX[k], IN_W], [st.queueX[k], SIM.orderZ],
  ];
  c.onArrive = () => { c.state = 'queue'; c.tQ = S.t; }; // mulai menunggu saat tiba di antrean
  if (rig.root) rig.root.visible = true;
  S.people.push(c); st.queue.push(c);
  metricsArrival(st.id);
  return true;
}

function updateCustomer(S, c, dt) {
  follow(c, dt);
  if (c.state === 'waitDrink') {
    const sl = c.slot;
    if (!sl || (c.drinkDone && !c.drinkOk) || S.t - c.tWait > 45) takeDrink(S, c, false); // gagal / menyerah menunggu
    else if (sl.ready) { c.state = 'picking'; c.pickT = 0.7; c.anim = 'hand'; }
  } else if (c.state === 'picking') {
    c.pickT -= dt;
    if (c.pickT <= 0) takeDrink(S, c, true);
  }
  if (c.state === 'sitting') {
    c.timer -= dt;
    if (c.holdBread && c.timer < c.sitTotal * 0.5) c.holdBread = false; // roti habis dimakan
    if (c.timer <= 0) { c.state = 'standing'; c.sitTarget = 0; }
  }
  if (c.state === 'standing' && c.sit < 0.03) {
    const seat = c.seat;
    c.holdBread = c.holdCup = false; c.hasTray = false; c.plate = false; // nampan dibawa pergi, piring/gelas bekas tertinggal
    seat.taken = false; seat.dirty = true; seatMess[seat.i] = true;     // meja kotor sampai dibersihkan
    c.seat = null;
    c.state = 'leaving';
    c.path = leavePath(seat.x, isYard(seat));
    c.onArrive = () => despawn(S, c);
  }
  const d = c.sitTarget - c.sit;
  c.sit += Math.sign(d) * Math.min(Math.abs(d), dt * 2.2);
  if ((c.state === 'queue' || c.state === 'ordering' || c.state === 'waitDrink' || c.state === 'picking') && !c.moving) c.targetFace = PI; // hadap etalase / bar
}

/* ---------- Petugas kebersihan ---------- */
// Wilayah: 'g' dalam gudang | 'w' trotoar/jalan | 'y' halaman depan Outlet | 'i' dalam Outlet
const inG = (x, z) => x > GUDANG.x0 && x < GUDANG.x1 && z > GUDANG.z0 && z < GUDANG.z1 + 0.05;
const zoneOf = (x, z) => (inG(x, z) ? 'g' : z >= 8.2 ? 'w' : z > 4.1 ? 'y' : 'i');
// Titik berdiri petugas di dekat meja (sisi utara bila meja di belakang, sisi selatan untuk meja depan-kanan)
const standOf = (s) => (s.tz > 6 ? [s.tx, s.tz - 0.9] : s.tz > 2 ? [s.tx, s.tz - 0.95] : [s.tx, s.tz + 0.8]);
const faceOf = (s) => (s.tz > 2 ? 0 : PI);

// Rute berlajur dari/ke gudang di sebelah dok: trotoar arah timur (pergi) dan barat (pulang), naik lewat celah pot
// pada lajur masuk, turun lewat lajur keluar; di dalam & halaman memakai lajur arah masing-masing
function cleanerRoute(from, to) {
  const G = GUDANG, pts = [];
  const [x, z] = from;
  const a = zoneOf(x, z), b = zoneOf(to[0], to[1]);
  if (b === 'g') { // pulang ke gudang: turun lewat lajur keluar -> trotoar barat -> pintu gudang
    if (a === 'i') { const lz = EXIT >= x ? IN_E : IN_W; pts.push([x, lz], [EXIT, lz], [EXIT, LANES.walkW]); }
    else if (a === 'y') { const yz = EXIT >= x ? LANES.yardE : LANES.yardW; pts.push([x, yz], [EXIT, yz], [EXIT, LANES.walkW]); }
    else pts.push([x, LANES.walkW]);
    pts.push([G.doorX, LANES.walkW], [G.doorX, G.z1], to);
    return pts;
  }
  if (a === 'g') pts.push([G.doorX, G.z1]);
  if (a === 'g' || a === 'w') { // keluar gudang -> trotoar timur -> naik lewat celah pot (lajur masuk)
    const sx = a === 'g' ? G.doorX : x;
    pts.push([sx, LANES.walkE], [DOOR_IN, LANES.walkE]);
    if (b === 'y') { const yz = to[0] >= DOOR_IN ? LANES.yardE : LANES.yardW; pts.push([DOOR_IN, yz], [to[0], yz]); }
    else { const lz = to[0] >= DOOR_IN ? IN_E : IN_W; pts.push([DOOR_IN, lz], [to[0], lz]); }
    pts.push(to);
    return pts;
  }
  if (a === 'i' && b === 'i') { const lz = to[0] >= x ? IN_E : IN_W; pts.push([x, lz], [to[0], lz]); }
  else if (a === 'y' && b === 'y') { const yz = to[0] >= x ? LANES.yardE : LANES.yardW; pts.push([x, yz], [to[0], yz]); }
  else if (a === 'i') { // dalam -> halaman: keluar lewat lajur keluar pintu
    const lz = EXIT >= x ? IN_E : IN_W, yz = to[0] >= EXIT ? LANES.yardE : LANES.yardW;
    pts.push([x, lz], [EXIT, lz], [EXIT, yz], [to[0], yz]);
  } else { // halaman -> dalam: masuk lewat lajur masuk pintu
    const yz = DOOR_IN >= x ? LANES.yardE : LANES.yardW, lz = to[0] >= DOOR_IN ? IN_E : IN_W;
    pts.push([x, yz], [DOOR_IN, yz], [DOOR_IN, lz], [to[0], lz]);
  }
  pts.push(to);
  return pts;
}

// Satu perjalanan: keluar gudang -> bereskan hingga 3 meja kotor terdekat -> kembali ke gudang -> menghilang
function planClean(S) {
  const C = S.C, G = GUDANG, T = (C.tasks = []);
  const walk = (to, face) => T.push({ k: 'walk', to, face });
  const act = (d, anim, face, o = {}) => T.push({ k: 'do', d, anim, face, ...o });
  C.cur = null; C.path = []; C.moving = false; C.holdCup = false; C.plate = false;
  C.x = G.inX; C.z = G.inZ; C.face = C.targetFace = 0;
  if (C.rig.root) C.rig.root.visible = true;
  const pool = S.seats.filter((s) => s.dirty && !s.cleaning);
  let at = [C.x, C.z];
  for (let k = 0; k < 3 && pool.length; k++) {
    pool.sort((a, b) => Math.hypot(a.x - at[0], a.z - at[1]) - Math.hypot(b.x - at[0], b.z - at[1]));
    const s = pool.shift();
    s.cleaning = true; at = [s.x, s.z];
    walk(standOf(s), faceOf(s));
    act(1.4, 'lift', faceOf(s), {
      start: () => say(S, C, 'Merapikan meja…', 1.4),
      end: () => { s.dirty = false; s.cleaning = false; seatMess[s.i] = false; C.holdCup = true; C.plate = true; },
    });
  }
  walk([G.inX, G.inZ], PI);
  act(1.0, 'lift', PI, {
    end: () => { C.holdCup = false; C.plate = false; if (C.rig.root) C.rig.root.visible = false; S.cleanAt = S.t + 5; },
  });
}

function resetCleaner(S) {
  const C = S.C;
  C.cur = null; C.tasks.length = 0; C.path = []; C.holdCup = false; C.plate = false;
  if (C.rig.root) C.rig.root.visible = false;
  S.seats.forEach((s) => { s.cleaning = false; });
  S.cleanAt = S.t + 5;
}

// Bar macet / error: barista direset, pelanggan yang menunggu minuman dilepaskan (slot dibebaskan lewat updateCustomer)
function resetBar(S) {
  const B = S.B;
  B.cur = null; B.tasks.length = 0; B.path = []; B.holdCup = false;
  S.slots.forEach((sl) => { if (sl.owner) { sl.owner.drinkDone = true; sl.owner.drinkOk = false; } });
}

export default function Customers() {
  const invalidate = useThree((s) => s.invalidate);
  const sim = useStore((s) => s.sim);
  const canSee = useStore((s) => canSeeLoc(s.user, 'outlet'));
  const rigs = useMemo(() => Array.from({ length: POOL }, () => ({ busy: false })), []);
  const cashierRigs = useMemo(() => STATIONS.map(() => ({})), []);
  const baristaRig = useMemo(() => ({}), []);
  const cleanerRig = useMemo(() => ({}), []);
  const world = useRef(null);
  if (!world.current) {
    const stations = STATIONS.map((cfg, i) => {
      const K = mkEntity(cashierRigs[i], cfg.serveX, SIM.staffZ, 0);
      K.tasks = []; K.cur = null; K.speed = WALK * 1.1;
      K.prio = 3; K.pushable = false; // kasir: didahulukan, tidak didorong
      return { ...cfg, K, queue: [] };
    });
    const B = mkEntity(baristaRig, SIM.baristaX, SIM.baristaZ, 0);
    B.tasks = []; B.cur = null; B.speed = WALK * 1.15;
    B.prio = 3; B.pushable = false;
    const C = mkEntity(cleanerRig, GUDANG.inX, GUDANG.inZ, 0); // petugas kebersihan: tinggal di gudang (tersembunyi saat menganggur)
    C.tasks = []; C.cur = null; C.speed = WALK * 1.15;
    C.prio = 2; C.pushable = false;
    seatMess.fill(false); barState.ready.fill(false);
    world.current = {
      t: 0, nextSpawn: 1.2, people: [], stations, B, C, cleanAt: 4,
      slots: PICKUP.slots.map((p, i) => ({ ...p, i, owner: null, ready: false })),
      seats: SEATS.map((s) => ({ ...s, taken: false, dirty: false, cleaning: false })),
    };
  }

  // Daftarkan staf ke registri anti-tabrakan & sumber POV (aman terhadap mount ganda); lepas saat scene dilepas
  useEffect(() => {
    const S = world.current;
    S.stations.forEach((s) => crowdAdd(s.K)); crowdAdd(S.B); crowdAdd(S.C);
    povSrc.stations = S.stations; povSrc.people = () => S.people;
    return () => {
      stopPov();
      povSrc.stations = []; povSrc.people = () => [];
      payClearLive();
      S.people.forEach(crowdDel); S.stations.forEach((s) => crowdDel(s.K)); crowdDel(S.B); crowdDel(S.C);
    };
  }, []);

  // Seragam barista & petugas kebersihan + penampilan kasir ke-2 + pose awal; bangunkan loop saat simulasi dihidupkan (mode render on-demand)
  useEffect(() => {
    const S = world.current, m = baristaRig.mats, k2 = cashierRigs[1]?.mats, cl = cleanerRig.mats;
    if (m) { m.shirt.color.set('#EDE3D1'); m.pants.color.set('#2B2B2B'); m.skin.color.set('#D4A073'); m.hair.color.set('#1B1B1B'); }
    if (k2) { k2.skin.color.set('#C68B62'); k2.hair.color.set('#2B1B12'); }
    if (cl) { cl.shirt.color.set('#4F8C86'); cl.pants.color.set('#2B2B2B'); cl.skin.color.set('#B98A62'); cl.hair.color.set('#241812'); }
    S.B.anim = 'rest';
    S.stations.forEach((s) => applyPose(s.K, 0.016, S.t));
    applyPose(S.B, 0.016, S.t); applyPose(S.C, 0.016, S.t);
    invalidate();
  }, [sim, canSee, baristaRig, cashierRigs, cleanerRig, invalidate]);

  useFrame((_, delta) => {
    const S = world.current, B = S.B, C = S.C, store = useStore.getState();
    if (store.sim) tickClock(Math.min(delta, 0.05)); // jam simulasi (DATA DEMO) berjalan selama simulasi aktif
    const enabled = store.sim && canSeeLoc(store.user, 'outlet');
    const working = S.people.length > 0 || B.cur || B.tasks.length > 0 || C.cur || C.tasks.length > 0
      || S.stations.some((s) => s.K.cur || s.K.tasks.length > 0);
    if (!enabled && !working) { doorReport('cust', 0, 99); return; } // diam -> tidak render ulang (hemat baterai)
    const dt = Math.min(delta, 0.05);
    S.t += dt;

    // Pemulih per stasiun: kasir direset, pelanggan yang sedang dilayani dilepas.
    const recover = (st) => {
      const K = st.K;
      K.cur = null; K.tasks.length = 0; K.path = [];
      K.holdBread = K.holdCup = false; K.bag = null;
      const h = st.queue[0];
      if (h && h.state === 'ordering') { try { finish(S, h); } catch { st.queue.shift(); } }
    };

    try {
      // Laju kedatangan mengikuti jam: ramai = interval lebih pendek, tutup (rate 0) = tidak ada pelanggan baru
      const rate = clockRate();
      if (enabled && rate > 0 && S.t >= S.nextSpawn) S.nextSpawn = S.t + (spawn(S, rigs) ? rand(8, 15) / rate : 1.5);

      const slotFree = S.slots.some((s) => !s.owner);
      S.stations.forEach((st) => {
        // geser maju di antrean
        st.queue.forEach((q, k) => {
          if (q.state === 'queue' && !q.path.length && Math.abs(q.x - st.queueX[k]) > 0.04) q.path = [[st.queueX[k], SIM.orderZ]];
        });
        const K = st.K, head = st.queue[0];
        // Kepala antrean "ordering" tetapi kasir menganggur = tugas hilang -> pulihkan
        if (head && head.state === 'ordering' && !K.cur && K.tasks.length === 0) recover(st);
        // kepala antrean siap & kasir bebas -> mulai dilayani (pesanan minuman menunggu bila meja bar penuh)
        else if (head && head.state === 'queue' && !head.path.length && Math.abs(head.x - st.queueX[0]) < 0.06
          && !K.cur && K.tasks.length === 0 && (!head.want.drink || slotFree)) startService(S, st, head);
      });

      // petugas kebersihan berangkat bila ada meja kotor
      if (enabled && !C.cur && !C.tasks.length && S.t >= S.cleanAt && S.seats.some((s) => s.dirty && !s.cleaning)) planClean(S);

      S.people.slice().forEach((c) => updateCustomer(S, c, dt));
      S.stations.forEach((st) => runTasks(st.K, dt, route));
      runTasks(B, dt);
      runTasks(C, dt, cleanerRoute);
      if (!B.cur && !B.tasks.length && !B.path.length) { B.anim = 'rest'; B.targetFace = 0; } // barista siaga di bar
      separate(dt); // orang yang terlalu berdekatan didorong menjauh

      // Sensor pintu: hanya orang yang benar-benar menuju / menyeberangi pintu yang dihitung
      let n = 0, dmin = 99;
      const walkers = C.rig.root?.visible ? [...S.people, C] : S.people;
      for (const p of walkers) {
        if (!wantsDoor(p, DOOR.x, OUTLET.zF, DOORSENS.range)) continue;
        n++; dmin = Math.min(dmin, Math.hypot(p.x - DOOR.x, p.z - OUTLET.zF));
      }
      doorReport('cust', n, dmin);
    } catch (err) {
      console.error('[Simulasi pelanggan]', err);
      S.stations.forEach(recover);
      resetBar(S); resetCleaner(S);
    }

    // Metrik antrean (DATA DEMO): hanya dihitung saat buka atau masih ada pelanggan. Kegagalan di sini tidak boleh mengganggu simulasi.
    try {
      metricsFrame(
        dt,
        clockRate() > 0 || S.people.length > 0,
        S.stations.map((st) => ({ id: st.id, q: st.queue.length, busy: !!(st.K.cur || st.K.tasks.length) })),
        !!((B.cur && B.cur.anim !== 'rest') || B.path.length),
      );
    } catch (err) { if (!S.warnedM) { S.warnedM = true; console.error('[Metrik]', err); } }

    // Pose tiap orang diterapkan terpisah: satu error tidak menghentikan yang lain
    const pose = (e) => {
      try { applyPose(e, dt, S.t); }
      catch (err) { if (!S.warned) { S.warned = true; console.error('[Pose]', err); } }
    };
    S.people.forEach(pose);
    S.stations.forEach((st) => pose(st.K));
    pose(B); pose(C);
    invalidate();
  });

  return (
    <>
      {rigs.map((rig, i) => <Person key={i} rig={rig} />)}
      {cashierRigs.map((rig, i) => <Person key={`k${i}`} rig={rig} shown outfit="cashier" />)}
      <Person rig={baristaRig} shown outfit="barista" />
      <Person rig={cleanerRig} outfit="cashier" />
    </>
  );
}