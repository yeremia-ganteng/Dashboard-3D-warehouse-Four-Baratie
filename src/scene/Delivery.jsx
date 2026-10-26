import * as THREE from 'three';
import { drawSign } from '../objects/textures.js';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore.js';
import { M } from '../objects/materials.js';
import Person from '../objects/Person.jsx';
import { SITE, PROD, PROD_DOOR, HAUL, RECV, DOOR, OUTLET, SIM, LANES, GUDANG } from './layout.js';
import { setGudang, gudangStock } from './serving.js';
import { traffic, farBusy } from './traffic.js';
import { reducedMotion } from './capability.js';
import { mkEntity, applyPose, runTasks, say, HALF, PI, prodDoorPing, doorReport, wantsDoor } from './actors.js';

const { road, dockX, parkX, padProdX, padOutX, padZ, standZ } = SITE;
const R = 1.0;             // radius putar balik
const UE = parkX + 4.4;    // pusat putar balik sisi Outlet
const UW = dockX - 4.2;    // pusat putar balik sisi Produksi
const WHEEL_R = 0.17;
const CRATE_Y = 0.125;     // tinggi pusat peti di atas lantai dok
const DRIVER_SPEED = 1.9;
const CRATE_BREAD = ['#D9A441', '#B9783F']; // peti roti
const CRATE_SUPPLY = '#6F8794';             // peti bahan (gudang pusat)
const DOCK_POS = [dockX, 0, road.near];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const lerp = (a, b, p) => a + (b - a) * p;

const arc = (cx, cz, a0, a1, n = 28) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + R * Math.cos(a), cz + R * Math.sin(a)];
  });

// Jalur terukur: titik-titik + tabel waktu supaya kecepatan realistis
// (pelan saat berangkat/berhenti dan di tikungan, cepat di jalan lurus).
// vMax = kecepatan maksimum (unit/detik); slow = pasangan indeks titik yang merupakan tikungan.
function makeRoute(pts, vMax, slow = []) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = cum[cum.length - 1];
  const zones = slow.map(([a, b]) => [cum[a], cum[b]]);
  const speed = (s) => {
    let f = 0.12 + 0.88 * smooth(Math.min(s, length - s) / 3);
    for (const [a, b] of zones) {
      const d = s < a ? a - s : s > b ? s - b : 0;
      f = Math.min(f, 0.3 + 0.7 * smooth(d / 2.5));
    }
    return vMax * f;
  };
  const step = 0.1, n = Math.ceil(length / step);
  const ts = [0];
  for (let i = 1; i <= n; i++) ts.push(ts[i - 1] + step / speed(Math.min(length, (i - 0.5) * step)));
  const T = ts[n];

  // waktu t -> posisi + arah hadap (out.h = rotasi Y), out.s = jarak tempuh
  const at = (t, out) => {
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ts[mid] <= t) lo = mid; else hi = mid; }
    const k = clamp01((t - ts[lo]) / (ts[hi] - ts[lo] || 1));
    const s = Math.min(length, (lo + k) * step);
    let j = 1;
    while (j < cum.length - 1 && cum[j] < s) j++;
    const [x0, z0] = pts[j - 1], [x1, z1] = pts[j];
    const f = (s - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    out.x = lerp(x0, x1, f); out.z = lerp(z0, z1, f);
    out.h = Math.atan2(-(z1 - z0), x1 - x0);
    out.s = s;
  };
  return { T, at };
}

// Berangkat: lajur dekat bangunan (kiri jalan), dari dok produksi ke dok samping Outlet
const GO = makeRoute([[dockX, road.near], [parkX, road.near]], 8);

// Pulang: maju, putar balik, lajur seberang, putar balik, parkir di dok
const backPts = [[parkX, road.near]];
const e0 = backPts.length; backPts.push(...arc(UE, road.mid, -Math.PI / 2, Math.PI / 2)); const e1 = backPts.length - 1;
const w0 = backPts.length; backPts.push(...arc(UW, road.mid, Math.PI / 2, (3 * Math.PI) / 2)); const w1 = backPts.length - 1;
backPts.push([dockX, road.near]);
const BACK = makeRoute(backPts, 13, [[e0, e1], [w0, w1]]);

const STAGE_LABEL = {
  load: 'Memuat peti…',
  go: 'Menuju Outlet',
  unload: 'Membongkar di dok samping',
  back: 'Kembali ke produksi',
};

// Isi muatan: roti dari stok produksi, bahan dari gudang pusat
const cargoText = (tr) => {
  const b = tr.filter((t) => t.src === 'produksi').reduce((a, t) => a + t.qty, 0);
  const s = tr.filter((t) => t.src !== 'produksi').length;
  return [b > 0 && `${Math.round(b)} roti`, s > 0 && `${s} bahan`].filter(Boolean).join(' + ');
};
// Warna & jumlah peti (maks 3) mengikuti muatan
const planCrates = (tr) => {
  const bread = tr.filter((t) => t.src === 'produksi').reduce((a, t) => a + t.qty, 0);
  const list = [];
  if (bread > 0) for (let i = 0; i < Math.min(2, Math.ceil(bread / 20)); i++) list.push(CRATE_BREAD[i]);
  if (tr.some((t) => t.src !== 'produksi')) list.push(CRATE_SUPPLY);
  return list.length ? list : [CRATE_BREAD[0]];
};

// Truk pengantar + sopir: muat -> jalan -> bongkar di dok samping Outlet (angka stok berubah) -> kembali
// Di dok muat, peti roti diantar dulu oleh pekerja Produksi (lewat pintu depan), baru dimuat sopir.
// Di dok bongkar, peti diambil pegawai Outlet dan dibawa masuk lewat pintu depan Outlet.
export default function Delivery({ night }) {
  const phase = useStore((s) => s.delivery.phase);
  const stage = useStore((s) => s.delivery.stage);
  const auto = useStore((s) => s.delivery.auto);
  const cargo = useStore((s) => cargoText(s.delivery.transfers));
  const invalidate = useThree((s) => s.invalidate);
  const van = useRef(), door = useRef();
  const wheels = useRef([]), padCrates = useRef([]), padMats = useRef([]);
  const driverRig = useMemo(() => ({}), []);
  const haulerRig = useMemo(() => ({}), []);
  const receiverRig = useMemo(() => ({}), []);
    // Logo truk = gambar yang sama dengan papan nama Outlet (digambar ulang setelah font siap)
  const logoTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => {
    const redraw = () => { drawSign(logoTex.image); logoTex.needsUpdate = true; invalidate(); };
    redraw();
    document.fonts?.load('600 40px "Playfair Display"').then(redraw).catch(() => {});
  }, [logoTex, invalidate]);
  const out = useRef({ x: 0, z: 0, h: 0, s: 0 });
  const st = useRef(null);
  if (!st.current) {
    const K = mkEntity(driverRig, 0, 0, 0);
    K.tasks = []; K.cur = null; K.speed = DRIVER_SPEED;
    // Pekerja pengantar peti: siaga di dalam Produksi (HAUL.homeX/homeZ)
    const H = mkEntity(haulerRig, HAUL.homeX, HAUL.homeZ, PI);
    H.tasks = []; H.cur = null; H.speed = HAUL.speed; H.useDoor = false; H.settle = 0;
    // Pegawai penerima peti di Outlet: hanya terlihat selama bertugas
    const P = mkEntity(receiverRig, RECV.x, RECV.inZ, PI);
    P.tasks = []; P.cur = null; P.speed = RECV.speed; P.useDoor = false; P.settle = 0;
    P.prio = 2; P.pushable = false; // didahulukan, tidak didorong pelanggan
    st.current = { stage: 'idle', t: 0, h: 0, odo: 0, lastS: 0, done: false, next: false, door: 0, doorT: 0, fade: -1, crateColors: [CRATE_BREAD[0]], dropped: true, K, H, P, HC: { t: 0 } };
  }

  // Seragam sopir
  useEffect(() => {
    const m = driverRig.mats;
    if (m) { m.shirt.color.set('#EDE3D1'); m.pants.color.set('#2B2B2B'); m.skin.color.set('#D4A073'); }
  }, [driverRig]);

  // Seragam + pose awal pekerja pengantar dan pegawai penerima
  useEffect(() => {
    const m = haulerRig.mats;
    if (m) { m.shirt.color.set('#F4EFE6'); m.pants.color.set('#2B2B2B'); m.skin.color.set('#B98A62'); m.hair.color.set('#241812'); }
    const r = receiverRig.mats;
    if (r) { r.shirt.color.set('#F4EFE6'); r.pants.color.set('#2B2B2B'); r.skin.color.set('#C99A72'); r.hair.color.set('#1B1B1B'); }
    applyPose(st.current.H, 0.016, 0);
    applyPose(st.current.P, 0.016, 0);
    invalidate();
  }, [haulerRig, receiverRig, invalidate]);

  // Tampilkan / sembunyikan peti di area dok (lo..hi = rentang slot; bawaan: semua slot)
  const showPad = (px, on, lo = 0, hi = 3) => {
    const n = st.current.crateColors.length;
    padCrates.current.forEach((g, i) => {
      if (!g || i < lo || i >= hi) return;
      g.visible = on && i < n;
      g.scale.setScalar(1);
      g.position.set(px + (i - (n - 1) / 2) * 0.5, CRATE_Y, padZ);
    });
  };
  const paint = (colors) => colors.forEach((c, i) => {
    padMats.current[i]?.color.set(c);
    driverRig.mats?.['crate' + i]?.color.set(c);
    haulerRig.mats?.['crate' + i]?.color.set(c);
    receiverRig.mats?.['crate' + i]?.color.set(c);
  });

  // Skenario pekerja pengantar: ambil nb peti dari rak baris depan -> keluar PINTU DEPAN -> taruh di dok -> kembali
  const haulScript = (nb) => {
    const S = st.current, H = S.H, HC = S.HC;
    const T = (H.tasks = []);
    const walk = (to, face, o = {}) => T.push({ k: 'walk', to, face, ...o });
    const act = (d, anim, face, o = {}) => T.push({ k: 'do', d, anim, face, ...o });
    const gx = PROD_DOOR.x, dropX = padProdX + HAUL.dropDX;

    H.cur = null; H.path = []; H.moving = false; H.holdCrate = 0; H.speed = HAUL.speed; H.useDoor = false;
    H.x = HAUL.homeX; H.z = HAUL.homeZ; H.face = H.targetFace = PI;

    for (let j = 0; j < nb; j++) {
      walk([HAUL.pickX[j % HAUL.pickX.length], HAUL.pickZ], PI);
      act(0.9, 'lift', PI, { end: () => { H.holdCrate = j + 1; } });
    }
    walk([gx, HAUL.pickZ], 0, { start: () => { H.useDoor = true; } }); // lurus ke tengah pintu
    walk([gx, HAUL.outZ], 0);                                           // keluar lewat pintu depan
    walk([gx, HAUL.yardZ], 0);
    walk([dropX, HAUL.yardZ], -HALF);                                   // ke kanan tumpukan peti di dok
    act(0.9, 'lift', -HALF, {
      end: () => {
        H.holdCrate = 0;
        showPad(padProdX, true, 0, nb);                                 // peti roti kini ada di dok
        S.dropped = true;
        say(HC, H, 'Peti siap di dok', 1.8);
      },
    });
    walk([gx, HAUL.yardZ], 0);                                          // pulang lewat jalur yang sama
    walk([gx, HAUL.outZ], PI);
    walk([gx, HAUL.pickZ], PI, { end: () => { H.useDoor = false; } });
    walk([HAUL.homeX, HAUL.homeZ], PI);
  };

  // Skenario pegawai penerima: tunggu sebentar di gudang -> pintu gudang (selatan) -> trotoar arah barat -> dok bongkar,
  // angkat n peti -> pulang lewat trotoar arah timur -> pintu gudang -> taruh peti di palet (peti tampak di gudang) -> menghilang
  const recvScript = (n) => {
    const S = st.current, P = S.P, HC = S.HC, G = GUDANG;
    const cols = S.crateColors.slice(0, n);
    const T = (P.tasks = []);
    const walk = (to, face, o = {}) => T.push({ k: 'walk', to, face, ...o });
    const act = (d, anim, face, o = {}) => T.push({ k: 'do', d, anim, face, ...o });

    P.cur = null; P.path = []; P.moving = false; P.holdCrate = 0; P.speed = RECV.speed; P.settle = 0;
    P.x = G.inX; P.z = G.inZ; P.face = P.targetFace = 0;
    P.useDoor = false;                                  // tidak lagi memakai pintu depan Outlet
    P.rig.setSay?.(null); P.sayUntil = 0;
    if (P.rig.root) P.rig.root.visible = true;

    act(1.2, 'rest', 0);                                // beri waktu sopir menyingkir dari dok
    walk([G.doorX, G.z1], 0);                           // keluar lewat pintu gudang
    walk([G.doorX, LANES.walkW], 0);                    // ke lajur barat trotoar
    walk([padOutX, LANES.walkW], -HALF);                // menyusur trotoar ke dok bongkar
    walk([padOutX, standZ], PI);                        // berdiri di depan tumpukan peti
    act(0.9, 'lift', PI, {
      end: () => {
        if (S.stage !== 'load') showPad(padOutX, false); // peti diangkat dari dok (jangan ganggu dok muat bila siklus baru)
        P.holdCrate = n;
      },
    });
    walk([padOutX, LANES.walkE], 0);                    // pulang di lajur timur trotoar
    walk([G.doorX, LANES.walkE], -HALF);
    walk([G.doorX, G.z1], PI);                          // masuk lewat pintu gudang
    walk([G.inX, G.placeZ], PI);                        // ke depan palet
    act(0.9, 'lift', PI, {
      end: () => {
        P.holdCrate = 0;
        setGudang([...gudangStock.cols, ...cols].slice(0, 3)); // peti tampak di palet gudang
        useStore.getState().readyStash();                      // barang di gudang kini boleh diambil pegawai pengisi rak
        say(HC, P, 'Stok masuk gudang', 1.6);
      },
    });
    act(1.2, 'rest', PI, {
      end: () => {
        P.useDoor = false; P.rig.setSay?.(null); P.sayUntil = 0;
        if (P.rig.root) P.rig.root.visible = false;     // dianggap lanjut bekerja di belakang
      },
    });
  };

  // Skenario kerja sopir untuk satu tahap ('load' di produksi, 'unload' di dok samping Outlet)
  const script = (name) => {
    const S = st.current, K = S.K, n = S.crateColors.length;
    const load = name === 'load';
    const tx = load ? dockX : parkX, px = load ? padProdX : padOutX;
    const cab = [tx + 0.55, road.near - 0.78];     // pintu kabin (sisi trotoar)
    const rear = [tx - 1.65, road.near - 0.2];     // di belakang truk (depan pintu kargo)
    const rearW = [tx - 1.65, road.near - 0.78];   // belakang truk, sisi trotoar
    const pad = [px, standZ];                      // di depan tumpukan peti
    const T = (K.tasks = []);
    const walk = (to, face, o = {}) => T.push({ k: 'walk', to, face, ...o });
    const act = (d, anim, face, o = {}) => T.push({ k: 'do', d, anim, face, ...o });
    const hide = () => { if (K.rig.root) K.rig.root.visible = false; S.next = true; };

    K.cur = null; K.path = []; K.moving = false; K.holdCrate = 0; K.speed = DRIVER_SPEED;
    K.x = cab[0]; K.z = cab[1]; K.face = K.targetFace = load ? PI : -HALF;
    if (K.rig.root) K.rig.root.visible = true;

    if (load) {
      const nb = S.crateColors.filter((c) => c !== CRATE_SUPPLY).length; // peti roti: diantar pekerja Produksi
      showPad(px, false, 0, nb);                                         // peti roti belum ada di dok
      showPad(px, true, nb);                                             // peti bahan (gudang pusat) sudah di dok
      S.dropped = nb === 0;
      if (nb > 0) {
        haulScript(nb);
        act(0, 'rest', PI, { until: () => S.dropped, max: 45 });        // sopir menunggu di samping truk
      }
      walk(pad, PI);
      act(0.9, 'lift', PI, { end: () => { showPad(px, false); K.holdCrate = n; } });
      walk(rear, HALF, { start: () => { S.doorT = 1; } });         // pintu belakang terbuka
      act(1.0, 'lift', HALF, { end: () => { K.holdCrate = 0; say(S, K, 'Siap berangkat!', 1.5); } });
      act(0.7, 'hand', HALF, { start: () => { S.doorT = 0; } });   // pintu ditutup
      walk(rearW, 0);
      walk(cab, HALF);
      act(0.3, 'hand', HALF, { end: hide });                       // sopir naik ke kabin
    } else {
      walk(rearW, 0);
      walk(rear, HALF, { start: () => { S.doorT = 1; } });
      act(1.0, 'lift', HALF, { end: () => { K.holdCrate = n; } });
      walk(pad, PI);
      act(0.9, 'lift', PI, {
        end: () => {
          K.holdCrate = 0; showPad(px, true); S.done = true;
          say(S, K, 'Pengiriman tiba!', 1.8);
          useStore.getState().completeDelivery();                  // angka stok kedua lokasi berubah di sini
          recvScript(n);                                           // pegawai Outlet mengambil peti dari dok
        },
      });
      act(1.2, 'hand', PI);
      walk(rear, HALF);
      act(0.7, 'hand', HALF, { start: () => { S.doorT = 0; } });
      walk(rearW, 0);
      walk(cab, HALF);
      act(0.3, 'hand', HALF, { end: hide });
    }
  };

  useEffect(() => {
    if (phase === 'moving' && st.current.stage === 'idle') {
      const S = st.current;
      S.crateColors = planCrates(useStore.getState().delivery.transfers);
      paint(S.crateColors);
      Object.assign(S, { stage: 'load', t: 0, h: 0, lastS: 0, done: false, next: false, door: 0, doorT: 0, fade: -1 });
      script('load');
      invalidate();
    }
  }, [phase, invalidate]); // eslint-disable-line

  // Jika scene dilepas di tengah pengiriman (mis. pindah ke 2D), selesaikan agar stok tidak macet
  useEffect(() => () => {
    const s = useStore.getState();
    if (s.delivery.phase === 'moving') {
      if (!st.current.done) s.completeDelivery({ direct: true });
      s.finishDelivery();
    }
  }, []);

  useFrame((_, dt) => {
    const S = st.current, H = S.H, P = S.P;
    const hBusy = !!(H.cur || H.tasks.length), rBusy = !!(P.cur || P.tasks.length);
    if (S.stage === 'idle' && !hBusy && !rBusy && H.settle <= 0 && P.settle <= 0) return;
    const quick = reducedMotion();
    const step = Math.min(dt, 0.05) * (quick ? 12 : 1); // batas dt: cegah lompatan setelah tab tidak aktif
    const store = useStore.getState();
    const o = out.current;
    S.t += step;
    const goTo = (name) => {
      S.stage = name; S.t = 0; S.lastS = 0; S.next = false;
      store.setDeliveryStage(name);
      if (name === 'load' || name === 'unload') script(name);
    };

    // pintu belakang membuka / menutup halus
    S.door += (S.doorT - S.door) * Math.min(1, step * 5);
    if (door.current) door.current.rotation.y = S.door * 1.6;

    // pekerja pengantar & pegawai penerima: jalan sampai tugasnya selesai, lalu diperbarui sebentar agar pose akhirnya rapi
    const haulOn = hBusy || H.settle > 0, recvOn = rBusy || P.settle > 0;
    if (haulOn || recvOn) S.HC.t += step;
    if (haulOn) {
      try {
        if (hBusy) { H.settle = 0.8; runTasks(H, step); } else H.settle -= step;
        applyPose(H, step, S.HC.t);
        if (H.useDoor && Math.hypot(H.x - PROD_DOOR.x, H.z - PROD.zF) < HAUL.doorRange) prodDoorPing();
      } catch (err) {
        console.error('[Pengantar]', err);
        H.tasks.length = 0; H.cur = null; H.holdCrate = 0; H.settle = 0; H.useDoor = false;
        S.dropped = true;                                   // jangan biarkan sopir menunggu selamanya
        if (S.stage === 'load') showPad(padProdX, true);
      }
    }
    if (recvOn) {
      try {
        if (rBusy) { P.settle = 0.8; runTasks(P, step); } else P.settle -= step;
        applyPose(P, step, S.HC.t);
        doorReport('recv', P.useDoor && wantsDoor(P, DOOR.x, OUTLET.zF, RECV.doorRange) ? 1 : 0, Math.hypot(P.x - DOOR.x, P.z - OUTLET.zF));
      } catch (err) {
        console.error('[Penerima]', err);
        P.tasks.length = 0; P.cur = null; P.holdCrate = 0; P.settle = 0; P.useDoor = false;
        if (P.rig.root) P.rig.root.visible = false;
        if (S.stage !== 'load') showPad(padOutX, false);   // jangan biarkan peti tertinggal di dok
        useStore.getState().readyStash(); // jangan biarkan barang di gudang tertahan bila penerima gagal
      }
    }
    // pintu Produksi juga membuka bila sopir mendekat
    const Kd = S.K;
    if (Kd.rig.root?.visible && Math.hypot(Kd.x - PROD_DOOR.x, Kd.z - PROD.zF) < HAUL.doorRange) prodDoorPing();

    const drive = (route) => {
      route.at(Math.min(S.t, route.T), o);
      const g = van.current;
      g.position.set(o.x, 0, o.z);
      let d = o.h - S.h;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // selisih sudut terpendek
      S.h += quick ? d : d * Math.min(1, step * 10);
      g.rotation.y = S.h;
      S.odo += Math.abs(o.s - S.lastS); S.lastS = o.s;
      wheels.current.forEach((w) => { if (w) w.rotation.z = -S.odo / WHEEL_R; });
    };
    const crew = () => { runTasks(S.K, step); applyPose(S.K, step, S.t); };

    if (S.stage === 'load') {
      crew();
      if (S.next) goTo('go');
    } else if (S.stage === 'go') {
      drive(GO);
      if (S.t >= GO.T) goTo('unload');
    } else if (S.stage === 'unload') {
      crew();
        if (S.next) {
        S.holdT = (S.holdT || 0) + step; // tunggu kendaraan lain lewat sebelum pulang (maks 25 dtk)
        if (!farBusy() || S.holdT > 25) { S.holdT = 0; goTo('back'); }
      }
    } else if (S.stage === 'back') {
      drive(BACK);
      if (S.t >= BACK.T) {
        S.stage = 'idle'; S.h = 0; S.done = false;
        van.current.position.set(...DOCK_POS);
        van.current.rotation.y = 0;
        store.finishDelivery();
      }
    }
    traffic.truck.stage = S.stage; // dibaca Traffic.jsx: pejalan & kendaraan lain menyesuaikan
    invalidate(); // lanjut render selama animasi berjalan // lanjut render selama animasi berjalan
  });

  const lit = night && stage !== 'idle';
  return (
    <>
      <group ref={van} position={DOCK_POS}>
        {/* bayangan palsu */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0.015, 0]} material={M.shadow}><planeGeometry args={[2.5, 1.15]} /></mesh>
        {/* sasis, bumper */}
        <mesh position={[0.03, 0.25, 0]} material={M.ink}><boxGeometry args={[2.3, 0.14, 0.84]} /></mesh>
        <mesh position={[1.19, 0.28, 0]} material={M.ink}><boxGeometry args={[0.06, 0.12, 0.88]} /></mesh>
        <mesh position={[-1.13, 0.3, 0]} material={M.ink}><boxGeometry args={[0.06, 0.1, 0.9]} /></mesh>
        {/* box kargo + list emas + atap krem */}
        <mesh position={[-0.45, 0.72, 0]} material={M.marun}><boxGeometry args={[1.3, 0.8, 0.9]} /></mesh>
        <mesh position={[-0.45, 0.6, 0]} material={M.gold}><boxGeometry args={[1.31, 0.03, 0.91]} /></mesh>
        <mesh position={[-0.45, 1.13, 0]} material={M.cream}><boxGeometry args={[1.36, 0.04, 0.94]} /></mesh>
        {/* logo bulat di kedua sisi (sama dengan papan nama Outlet) */}
        {[1, -1].map((d) => (
          <group key={d} position={[-0.45, 0.8, d * 0.458]} rotation={[0, d > 0 ? 0 : Math.PI, 0]}>
            <mesh><circleGeometry args={[0.26, 40]} /><meshBasicMaterial map={logoTex} /></mesh>
            <mesh position={[0, 0, 0.002]} material={M.gold}><ringGeometry args={[0.26, 0.285, 40]} /></mesh>
          </group>
        ))}
        {/* kabin + kap mesin + kaca */}
        <mesh position={[0.5, 0.635, 0]} material={M.marun}><boxGeometry args={[0.6, 0.63, 0.86]} /></mesh>
        <mesh position={[0.5, 0.96, 0]} material={M.cream}><boxGeometry args={[0.64, 0.04, 0.9]} /></mesh>
        <mesh position={[0.98, 0.49, 0]} material={M.marun}><boxGeometry args={[0.38, 0.34, 0.84]} /></mesh>
        <mesh position={[0.802, 0.78, 0]}><boxGeometry args={[0.03, 0.3, 0.7]} /><meshLambertMaterial color="#25323A" /></mesh>
        {[1, -1].map((d) => (
          <mesh key={d} position={[0.5, 0.78, d * 0.435]}><boxGeometry args={[0.4, 0.28, 0.02]} /><meshLambertMaterial color="#25323A" /></mesh>
        ))}
        {/* lampu depan & belakang */}
        {[1, -1].map((d) => (
          <group key={d}>
            <mesh position={[1.18, 0.46, d * 0.3]}><boxGeometry args={[0.03, 0.1, 0.18]} /><meshBasicMaterial color={lit ? '#FFE7A3' : '#F4EBDD'} /></mesh>
            <mesh position={[-1.11, 0.45, d * 0.36]}><boxGeometry args={[0.03, 0.1, 0.14]} /><meshBasicMaterial color="#D63B3B" /></mesh>
          </group>
        ))}
        {lit && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.2, 0.022, 0]}>
            <planeGeometry args={[2, 0.9]} />
            <meshBasicMaterial color="#FFE2A0" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        )}
        {/* rongga kargo (tampak saat pintu belakang terbuka) + pintu berengsel di sisi jalan */}
        <mesh position={[-1.101, 0.72, 0]}><boxGeometry args={[0.02, 0.68, 0.78]} /><meshLambertMaterial color="#1C1416" /></mesh>
        <group ref={door} position={[-1.1, 0.72, 0.45]}>
          <mesh position={[0, 0, -0.45]} material={M.marun}><boxGeometry args={[0.04, 0.78, 0.9]} /></mesh>
        </group>
        {/* roda berputar sesuai jarak tempuh */}
        {[[-0.65, -0.42], [-0.65, 0.42], [0.75, -0.42], [0.75, 0.42]].map(([x, z], i) => (
          <group key={i} position={[x, WHEEL_R, z]} ref={(el) => { wheels.current[i] = el; }}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={M.ink}><cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.1, 14]} /></mesh>
            <mesh position={[0.07, 0, z > 0 ? 0.052 : -0.052]} material={M.gold}><boxGeometry args={[0.07, 0.05, 0.01]} /></mesh>
          </group>
        ))}
        {/* label status pengiriman */}
        {stage !== 'idle' && (
          <Html position={[0.1, 1.7, 0]} center pointerEvents="none" zIndexRange={[12, 0]}>
            <div className="vantag" aria-hidden="true">
              🚚 {auto ? 'Otomatis · ' : ''}{STAGE_LABEL[stage]}{stage === 'go' && cargo ? ` · ${cargo}` : ''}
            </div>
          </Html>
        )}
      </group>

      {/* peti di dok (koordinat dunia, diatur di showPad) */}
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { padCrates.current[i] = el; }} visible={false}>
          <mesh>
            <boxGeometry args={[0.38, 0.2, 0.3]} />
            <meshLambertMaterial ref={(m) => { padMats.current[i] = m; }} color="#D9A441" />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={M.cream}><boxGeometry args={[0.4, 0.02, 0.32]} /></mesh>
          <mesh position={[0, 0, 0.151]} material={M.gold}><boxGeometry args={[0.12, 0.05, 0.004]} /></mesh>
        </group>
      ))}

      <Person rig={driverRig} outfit="driver" />
      <Person rig={haulerRig} shown outfit="chef" />
      <Person rig={receiverRig} outfit="cashier" />
    </>
  );
}