import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store/useStore.js';
import Person from '../objects/Person.jsx';
import { GUDANG as G, LANES, SIM, DOOR, DOORSENS, OUTLET, RESTOCK as RS } from './layout.js';
import { gudangStock, setGudang } from './serving.js';
import { mkEntity, applyPose, runTasks, say, crowdAdd, crowdDel, doorReport, wantsDoor, PI, HALF } from './actors.js';

/* ============ Pegawai pengisi rak (gudang -> Outlet) ============
   Bila ada barang di gudang Outlet yang sudah diletakkan pegawai penerima (store.stash, ready = true):
   ambil peti dari palet gudang -> keluar pintu gudang -> trotoar -> pintu depan Outlet -> lorong ujung kiri pulau Bar Kopi
   -> isi etalase roti (stok Outlet naik) -> isi rak bahan di lorong belakang konter (stok naik) -> pulang ke gudang.
   Angka stok Outlet berubah lewat store.restockOutlet() tepat saat peti ditaruh di rak. Tanpa cahaya titik. */

const CRATE_BREAD = ['#D9A441', '#B9783F'];
const CRATE_SUPPLY = '#6F8794';
const isBread = (t) => t.src === 'produksi';

// Warna & jumlah peti (maks 3), sama dengan aturan di Delivery.jsx
function crateCols(list) {
  const bread = list.filter(isBread).reduce((a, t) => a + t.qty, 0);
  const cols = [];
  for (let i = 0; i < Math.min(2, Math.ceil(bread / 20)); i++) cols.push(CRATE_BREAD[i]);
  if (list.some((t) => !isBread(t))) cols.push(CRATE_SUPPLY);
  return cols;
}
const paint = (R, cols) => [0, 1, 2].forEach((i) => { const m = R.rig.mats?.['crate' + i]; if (m && cols[i]) m.color.set(cols[i]); });
const restock = (ids) => (ids.length ? useStore.getState().restockOutlet(ids) : 0);

// Susun satu perjalanan untuk daftar barang `list`
function begin(S, list) {
  const R = S.R;
  const cols = crateCols(list);
  S.active = true; S.waiting = false; S.ids = list.map((t) => t.id);
  if (!cols.length) { restock(S.ids); S.active = false; return; }
  const nb = cols.filter((c) => c !== CRATE_SUPPLY).length, sup = cols.includes(CRATE_SUPPLY);
  const breadIds = list.filter(isBread).map((t) => t.id), supIds = list.filter((t) => !isBread(t)).map((t) => t.id);
  paint(R, cols);
  if (!gudangStock.cols.length) setGudang(cols); // setelah muat ulang: peti tampak di palet sebelum diambil

  const T = (R.tasks = []);
  const walk = (to, face, o = {}) => T.push({ k: 'walk', to, face, ...o });
  const act = (d, anim, face, o = {}) => T.push({ k: 'do', d, anim, face, ...o });
  const xI = SIM.doorInX, xO = SIM.doorOutX, L = RS.lane, backZ = RS.suppliesStop[1];

  R.cur = null; R.path = []; R.moving = false; R.holdCrate = 0; R.speed = RS.speed;
  R.x = G.inX; R.z = G.inZ; R.face = R.targetFace = PI;
  R.rig.setSay?.(null); R.sayUntil = 0;
  if (R.rig.root) R.rig.root.visible = true;

  // 1) ambil peti dari palet gudang
  walk([G.inX, G.placeZ], PI);
  act(1.0, 'lift', PI, { end: () => { R.holdCrate = cols.length; setGudang([]); say(S, R, 'Ambil stok dari gudang', 1.6); } });
  // 2) keluar pintu gudang -> trotoar (arah timur) -> masuk pintu depan Outlet lewat lajur masuk -> lorong ujung kiri pulau
  walk([G.doorX, G.z1], 0);
  walk([G.doorX, LANES.walkE], 0);
  walk([xI, LANES.walkE], HALF);
  walk([xI, LANES.inW], PI);
  walk([L, LANES.inW], -HALF);
  walk([L, SIM.staffZ], PI);
  // 3) isi etalase roti (stok roti Outlet naik)
  if (nb > 0) {
    walk(RS.breadStop, -HALF);
    act(1.6, 'lift', -HALF, {
      start: () => say(S, R, 'Mengisi etalase…', 1.6),
      end: () => { restock(breadIds); R.holdCrate = cols.length - nb; paint(R, cols.slice(nb)); },
    });
    walk([L, SIM.staffZ], 0);
  }
  // 4) isi rak bahan di lorong belakang konter (stok bahan Outlet naik)
  if (sup) {
    walk([L, backZ], PI);
    walk(RS.suppliesStop, PI);
    act(1.6, 'lift', PI, {
      start: () => say(S, R, 'Mengisi rak bahan…', 1.6),
      end: () => { restock(supIds); R.holdCrate = 0; },
    });
    walk([L, backZ], HALF);
    walk([L, SIM.staffZ], 0);
  }
  // 5) pulang: lajur timur dalam -> lajur keluar pintu -> trotoar (arah barat) -> pintu gudang
  walk([L, LANES.inE], HALF);
  walk([xO, LANES.inE], HALF);
  walk([xO, LANES.walkW], 0);
  walk([G.doorX, LANES.walkW], -HALF);
  walk([G.doorX, G.z1], PI);
  walk([G.inX, G.inZ], PI);
  act(0.8, 'rest', PI, {
    end: () => {
      R.holdCrate = 0; R.rig.setSay?.(null); R.sayUntil = 0;
      if (R.rig.root) R.rig.root.visible = false; // kembali bekerja di gudang
      S.active = false; S.cool = S.t + 3;
    },
  });
}

// Error / macet: pegawai disembunyikan dan barang yang belum masuk rak langsung dimasukkan agar stok tidak tertahan
function abort(S) {
  const R = S.R;
  R.tasks.length = 0; R.cur = null; R.path = []; R.holdCrate = 0;
  if (R.rig.root) R.rig.root.visible = false;
  S.active = false; S.waiting = false; S.cool = S.t + 3;
  setGudang([]);
  restock(S.ids);
}

export default function Restock() {
  const invalidate = useThree((s) => s.invalidate);
  const hasReady = useStore((s) => s.stash.some((t) => t.ready));
  const rig = useMemo(() => ({}), []);
  const st = useRef(null);
  if (!st.current) {
    const R = mkEntity(rig, G.inX, G.inZ, PI);
    R.tasks = []; R.cur = null; R.speed = RS.speed; R.prio = 2; R.pushable = false; // didahulukan, tidak didorong
    st.current = { t: 0, R, active: false, waiting: false, startAt: 0, cool: 0, ids: [] };
  }

  // Bangunkan loop saat ada barang yang siap diambil (mode render on-demand)
  useEffect(() => { invalidate(); }, [hasReady, invalidate]);

  // Seragam + registri anti-tabrakan; saat scene dilepas, barang di gudang langsung dimasukkan ke Outlet
  useEffect(() => {
    const S = st.current, R = S.R, m = rig.mats;
    crowdAdd(R);
    if (m) { m.shirt.color.set('#5B7FA6'); m.pants.color.set('#2B2B2B'); m.skin.color.set('#B98A62'); m.hair.color.set('#241812'); }
    applyPose(R, 0.016, 0);
    return () => {
      crowdDel(R);
      doorReport('restock', 0, 99);
      const s = useStore.getState();
      if (s.stash.length) s.restockOutlet();
      setGudang([]);
    };
  }, [rig]);

  useFrame((_, delta) => {
    const S = st.current, R = S.R;
    const ready = useStore.getState().stash.filter((t) => t.ready);
    const busy = !!(R.cur || R.tasks.length);
    if (!busy && !S.active && !ready.length) { S.waiting = false; doorReport('restock', 0, 99); return; } // diam -> tidak render ulang
    const dt = Math.min(delta, 0.05);
    S.t += dt;
    try {
      if (!S.active && !busy && ready.length) {
        if (!S.waiting) { S.waiting = true; S.startAt = Math.max(S.t + RS.startDelay, S.cool); }
        else if (S.t >= S.startAt) begin(S, ready);
      }
      runTasks(R, dt);
      const vis = !!R.rig.root?.visible;
      doorReport('restock', vis && wantsDoor(R, DOOR.x, OUTLET.zF, DOORSENS.range) ? 1 : 0, Math.hypot(R.x - DOOR.x, R.z - OUTLET.zF));
    } catch (err) {
      console.error('[Pengisi rak]', err);
      abort(S);
    }
    try { if (R.rig.root?.visible) applyPose(R, dt, S.t); }
    catch (err) { if (!S.warned) { S.warned = true; console.error('[Pose pengisi rak]', err); } }
    invalidate();
  });

  return <Person rig={rig} outfit="cashier" />;
}