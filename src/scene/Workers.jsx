import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore, roti } from '../store/useStore.js';
import { sid } from '../store/helpers.js';
import { LAYOUT, WORK } from './layout.js';
import Person from '../objects/Person.jsx';
import { mkEntity, applyPose, runTasks, say, PI } from './actors.js';
import { oven } from './serving.js';

/* ============ Simulasi produksi ============
   Pekerja adonan : menguleni di meja adonan (berulang).
   Pembakar       : ambil adonan -> masuk oven -> tunggu matang -> angkat -> taruh di rak.
                    Stok roti produksi bertambah saat loyang diletakkan di rak (store.produceBatch).
   Progres panggang ditulis ke serving.js -> oven (dibaca objects/OvenProgress.jsx).
   Berjalan selama simulasi aktif (tidak bergantung peran), supaya pasokan roti tetap ada. */

// Jalur pembakar: lewat lorong supaya tidak menembus pekerja adonan, meja, atau rak
const bakerRoute = (from, to) => {
  const back = (z) => z < -0.4;
  const Lz = WORK.laneZ, C = WORK.corridorX;
  if (back(from[1]) && back(to[1])) return [[from[0], Lz], [to[0], Lz], to];
  if (back(from[1])) return [[from[0], Lz], [C, Lz], [C, to[1]], to];
  if (back(to[1])) return [[C, from[1]], [C, Lz], [to[0], Lz], to];
  return [to];
};

// Pilih roti yang stok produksinya paling kosong, lalu susun satu siklus memanggang
function planBake(S) {
  const B = S.B, T = B.tasks, stocks = useStore.getState().stocks;
  let best = null, low = 0.97;
  roti.forEach((i) => {
    const s = stocks[sid(i.id, 'produksi')];
    if (!s || !LAYOUT[sid(i.id, 'produksi')]) return;
    if (s.qty / s.cap < low) { low = s.qty / s.cap; best = i; }
  });
  if (!best) { T.push({ k: 'do', d: 4, anim: 'rest', face: PI }); return; } // semua rak penuh -> istirahat

  const rk = LAYOUT[sid(best.id, 'produksi')].pos;
  const row1 = rk[2] < 1; // baris belakang (z kecil) dihadapi dari selatan
  const stand = [rk[0], row1 ? rk[2] + 0.9 : rk[2] - 0.9];
  const faceRack = row1 ? PI : 0;
  T.push(
    { k: 'walk', to: [WORK.pickX, WORK.pickZ], face: PI },
    { k: 'do', d: 1.0, anim: 'lift', face: PI, end: () => { B.rig.mats.bun.color.set(best.color); B.holdBake = true; } },
    { k: 'walk', to: [WORK.ovenX, WORK.ovenZ], face: PI },
    { k: 'do', d: 1.1, anim: 'oven', face: PI, end: () => { B.holdBake = false; say(S, B, `${best.name} masuk oven`, 1.8); } },
    { k: 'do', d: WORK.bakeTime, anim: 'rest', face: PI, bake: true, name: best.name, color: best.color }, // penanda untuk bar progres oven
    { k: 'do', d: 1.1, anim: 'oven', face: PI, end: () => { B.holdBake = true; say(S, B, 'Matang!', 1.3); } },
    { k: 'walk', to: stand, face: faceRack },
    {
      k: 'do', d: 1.0, anim: 'lift', face: faceRack,
      end: () => {
        const q = useStore.getState().produceBatch(best.id, WORK.batch); // stok produksi bertambah
        B.holdBake = false;
        if (q > 0) say(S, B, `+${q} ${best.name}`, 2);
      },
    },
  );
}

export default function Workers() {
  const invalidate = useThree((s) => s.invalidate);
  const sim = useStore((s) => s.sim);
  const doughRig = useMemo(() => ({}), []);
  const bakerRig = useMemo(() => ({}), []);
  const st = useRef(null);
  if (!st.current) {
    const D = mkEntity(doughRig, WORK.doughX, WORK.doughZ, PI);
    const B = mkEntity(bakerRig, WORK.pickX, WORK.pickZ, PI);
    [D, B].forEach((e) => { e.tasks = []; e.cur = null; });
    st.current = { t: 0, D, B };
  }

  // Warna seragam + pose awal; bangunkan loop saat simulasi dihidupkan (render on-demand)
  useEffect(() => {
    const S = st.current;
    const look = (rig, skin, hair) => {
      const m = rig.mats; if (!m) return;
      m.shirt.color.set('#F4EFE6'); m.pants.color.set('#2B2B2B'); m.skin.color.set(skin); m.hair.color.set(hair);
    };
    look(doughRig, '#E0AC84', '#1B1B1B');
    look(bakerRig, '#C68B62', '#2B1B12');
    applyPose(S.D, 0.016, 0); applyPose(S.B, 0.016, 0);
    invalidate();
  }, [sim, doughRig, bakerRig, invalidate]);

  useFrame((_, delta) => {
    const S = st.current, store = useStore.getState();
    const enabled = store.sim;
    const busy = S.D.cur || S.D.tasks.length || S.B.cur || S.B.tasks.length;
    if (!enabled && !busy) { oven.on = false; return; } // diam -> tidak render ulang (hemat baterai)
    const dt = Math.min(delta, 0.05);
    S.t += dt;
    try {
      if (enabled) {
        if (!S.D.cur && !S.D.tasks.length) S.D.tasks.push({ k: 'do', d: 8, anim: 'knead', face: PI });
        if (!S.B.cur && !S.B.tasks.length) planBake(S);
      }
      runTasks(S.D, dt);
      runTasks(S.B, dt, bakerRoute);
      // progres panggang di atas oven (objects/OvenProgress.jsx)
      const cur = S.B.cur;
      if (cur && cur.bake) { oven.on = true; oven.p = Math.min(1, cur.t / cur.d); oven.name = cur.name; oven.color = cur.color; }
      else oven.on = false;
    } catch (err) {
      console.error('[Produksi]', err);
      S.B.tasks.length = 0; S.B.cur = null; S.B.holdBake = false; // pulihkan agar simulasi tidak membeku
      oven.on = false;
    }
    try { applyPose(S.D, dt, S.t); applyPose(S.B, dt, S.t); }
    catch (err) { if (!S.warned) { S.warned = true; console.error('[Pose produksi]', err); } }
    invalidate();
  });

  return (
    <>
      <Person rig={doughRig} shown outfit="chef" />
      <Person rig={bakerRig} shown outfit="chef" />
    </>
  );
}