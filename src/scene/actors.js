import { HIP, SEAT_HIP } from '../objects/Person.jsx';

// Logika gerak figur yang dipakai bersama: pelanggan, kasir, pekerja produksi, sopir.
// Entitas = data logika (posisi, arah, bawaan). applyPose() menerjemahkannya ke sendi 3D.
export const PI = Math.PI, TAU = PI * 2, HALF = PI / 2;
export const WALK = 1.35; // kecepatan jalan (unit/detik)
export const lerp = (a, b, p) => a + (b - a) * p;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* ---------- Sensor pintu Outlet ----------
   Tiap sumber (pelanggan, pegawai penerima) melaporkan tiap frame: n = jumlah orang yang sedang
   menuju/menyeberangi pintu, d = jarak terdekat. Laporan yang basi (> 350 ms) diabaikan.
   Keputusan buka/tutup ada di Building.jsx (aturan di layout.js -> DOORSENS). */
const sense = {};
export const doorReport = (key, n, d = 99) => { sense[key] = { n, d, at: performance.now() }; };
export function doorReading() {
  const now = performance.now();
  let n = 0, d = 99;
  for (const k in sense) {
    const s = sense[k];
    if (now - s.at > 350) continue;
    n += s.n;
    if (s.n > 0 && s.d < d) d = s.d;
  }
  return { n, d };
}
// Apakah e sedang menuju / menyeberangi bidang pintu (z = dz) dalam jangkauan? Yang hanya lewat di halaman tidak dihitung.
export function wantsDoor(e, dx, dz, range) {
  if (!e.path.length) return false;
  if (Math.hypot(e.x - dx, e.z - dz) > range) return false;
  if (Math.abs(e.z - dz) < 0.6) return true;        // sedang di ambang pintu
  const outside = e.z > dz;
  return e.path.some((p) => (p[1] > dz) !== outside); // jalurnya menyeberang bidang pintu
}
// Kompatibilitas (kode lama): tidak lagi mengendalikan pintu
export const door = { get near() { return doorReading().n > 0; }, set near(_v) { /* diabaikan */ } };
export const doorHold = () => {};

// Sinyal ke pintu Unit Produksi: pintu terbuka selama performance.now() < prodDoor.until
export const prodDoor = { until: 0 };
export const prodDoorPing = (ms = 900) => { prodDoor.until = performance.now() + ms; };

/* ---------- Anti-tabrakan ----------
   Semua entitas masuk `crowd` (otomatis lewat mkEntity). Di follow(): bila ada orang di depan dalam
   jalur yang sama, entitas melambat lalu berhenti di jarak STOP. Bila dua orang saling menghadang,
   hanya satu yang mengalah (prio lebih rendah). separate() mendorong pelanggan yang terlalu dekat
   (kasir/barista tidak didorong). */
const STOP = 0.62, SLOW = 1.25, LAT = 0.46, CONE = 0.35, STALL_MAX = 5, MINSEP = 0.4;
export const crowd = [];
export const crowdAdd = (e) => { if (!crowd.includes(e)) crowd.push(e); return e; };
export const crowdDel = (e) => { const i = crowd.indexOf(e); if (i >= 0) crowd.splice(i, 1); };
let UID = 0;
const present = (o) => !!(o.rig && o.rig.root && o.rig.root.visible);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export const mkEntity = (rig, x, z, face) => crowdAdd({
  rig, x, z, face, targetFace: face, moving: false, phase: Math.random() * TAU, swing: 0,
  sit: 0, sitTarget: 0, arm: [0, -0.1, 0, -0.1],
  holdBread: false, holdCup: false, holdCrate: 0, holdBake: false,
  anim: null, sayUntil: 0, path: [], onArrive: null, speed: WALK, seed: Math.random(),
  uid: ++UID, prio: 0, pushable: true, stall: 0, free: 0, vf: 1,
});

// Faktor kecepatan 0..1 menurut orang di depan (1 = bebas, 0 = berhenti)
function brakeFactor(e, ux, uz) {
  let f = 1;
  for (let i = 0; i < crowd.length; i++) {
    const o = crowd[i];
    if (o === e || !present(o)) continue;
    const rx = o.x - e.x, rz = o.z - e.z, dist = Math.hypot(rx, rz);
    if (dist >= SLOW || dist < 1e-4) continue;
    if ((rx * ux + rz * uz) / dist < CONE) continue;   // tidak di depan
    if (Math.abs(rx * uz - rz * ux) > LAT) continue;   // tidak di jalur yang sama
    if (o.path.length) { // o juga sedang berjalan ke arah e? -> saling menghadang, satu pihak mengalah
      const q = o.path[0], qx = q[0] - o.x, qz = q[1] - o.z, ql = Math.hypot(qx, qz);
      if (ql > 1e-4 && (-rx * qx - rz * qz) / (dist * ql) > CONE && Math.abs(-rx * qz + rz * qx) / ql <= LAT) {
        const iYield = o.prio > e.prio || (o.prio === e.prio && o.uid < e.uid);
        if (!iYield) continue;
      }
    }
    f = Math.min(f, clamp01((dist - STOP) / (SLOW - STOP)));
  }
  return f;
}

export function follow(e, dt) {
  if (!e.path.length) { e.moving = false; e.vf = 1; e.stall = 0; return; }
  const [tx, tz] = e.path[0];
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
  let f = 1;
  if (e.free > 0) e.free -= dt;
  else if (d > 1e-4) f = brakeFactor(e, dx / d, dz / d);
  if (f < 0.05) { e.stall += dt; if (e.stall > STALL_MAX) { e.free = 1.8; e.stall = 0; } } else e.stall = 0; // pengaman anti-macet
  e.vf = f;
  e.moving = f > 0.12;
  const step = e.speed * f * dt;
  if (d <= step) {
    e.x = tx; e.z = tz; e.path.shift();
    if (!e.path.length) { e.moving = false; const cb = e.onArrive; e.onArrive = null; cb?.(); }
  } else {
    e.x += (dx / d) * step; e.z += (dz / d) * step; e.targetFace = Math.atan2(dx, dz);
  }
}

// Dorong pelanggan yang terlalu berdekatan (panggil sekali per frame)
const canPush = (e) => e.pushable && e.sit < 0.3;
export function separate(dt) {
  const k = Math.min(1, dt * 8);
  for (let i = 0; i < crowd.length; i++) {
    const a = crowd[i];
    if (!present(a)) continue;
    for (let j = i + 1; j < crowd.length; j++) {
      const b = crowd[j];
      if (!present(b)) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
      if (d2 >= MINSEP * MINSEP) continue;
      const d = Math.sqrt(d2);
      const nx = d > 1e-3 ? dx / d : 1, nz = d > 1e-3 ? dz / d : 0, ov = (MINSEP - d) * k;
      const pa = canPush(a), pb = canPush(b);
      if (pa && pb) { a.x -= (nx * ov) / 2; a.z -= (nz * ov) / 2; b.x += (nx * ov) / 2; b.z += (nz * ov) / 2; }
      else if (pa) { a.x -= nx * ov; a.z -= nz * ov; }
      else if (pb) { b.x += nx * ov; b.z += nz * ov; }
    }
  }
}

// Pose lengan per aksi: [bahuL, sikuL, bahuR, sikuR] (negatif = ke depan)
export const ARMS = {
  ring: (t) => [-0.95 + Math.sin(t * 10) * 0.06, -0.7, -0.95 + Math.sin(t * 10 + 1.6) * 0.06, -0.7],
  reachLow: () => [-0.25, -0.2, -0.95, -0.3],
  reachHigh: () => [-0.25, -0.2, -1.4, -0.15],
  brew: (t) => [-0.95, -0.75, -0.9 + Math.sin(t * 7) * 0.05, -0.8],
  hand: () => [-1.05, -0.35, -1.05, -0.35],
  talk: (t) => [-0.12, -0.12, -0.45 + Math.sin(t * 3.2) * 0.28, -0.75],
  pack: (t) => [-0.9 + Math.sin(t * 8) * 0.05, -0.8, -0.9 - Math.sin(t * 8) * 0.05, -0.8],
  knead: (t) => [-0.95 + Math.sin(t * 5) * 0.22, -0.55, -0.95 + Math.sin(t * 5 + PI) * 0.22, -0.55], // menguleni
  oven: () => [-1.15, -0.3, -1.15, -0.3],                                                             // masuk/keluarkan loyang
  lift: () => [-0.95, -0.45, -0.95, -0.45],                                                           // angkat/taruh dua tangan
  rest: (t) => [-0.35, -1.05 + Math.sin(t * 1.5) * 0.04, -0.35, -1.05],                               // tangan bersedekap
};

// Terapkan state logika -> sendi 3D
export function applyPose(e, dt, t) {
  const r = e.rig;
  if (!r.root || !r.body || !r.hold) return;
  const k = 1 - Math.exp(-12 * dt);
  e.face += angDiff(e.face, e.targetFace) * (1 - Math.exp(-9 * dt));
  if (e.moving) e.phase += dt * 6.4 * ((e.speed * (e.vf ?? 1)) / WALK);
  e.swing += ((e.moving ? Math.sin(e.phase) : 0) - e.swing) * k;
  r.root.position.set(e.x, 0, e.z);
  r.root.rotation.y = e.face;

  const sit = e.sit, lg = e.swing * 0.62 * (1 - sit);
  r.body.position.set(0, lerp(HIP, SEAT_HIP, sit) + (e.moving ? Math.abs(Math.cos(e.phase)) * 0.018 : 0), -0.03 * sit);
  r.legL.rotation.x = lg - sit * HALF;                 // duduk: paha mendatar ke depan
  r.legR.rotation.x = -lg - sit * HALF;
  r.kneeL.rotation.x = Math.max(0, lg) * 0.9 + sit * HALF; // duduk: betis turun
  r.kneeR.rotation.x = Math.max(0, -lg) * 0.9 + sit * HALF;

  const eating = e.holdBread || e.holdCup;
  const holding = eating || e.holdCrate > 0 || e.holdBake;
  let T;
  if (e.anim && ARMS[e.anim]) T = ARMS[e.anim](t);
  else if (sit > 0.5) {
    const ph = (t * 0.22 + e.seed) % 1;
    const eat = eating && ph < 0.3 ? Math.sin((ph / 0.3) * PI) : 0; // sesekali suap
    T = [-0.85, -0.35, -0.85 - eat * 0.5, -0.4 - eat * 1.15];
  } else if (holding) T = [-0.75, -0.95, -0.75, -0.95];
  else if (e.bag) { const s = e.swing * 0.55; T = [-s, -0.1, -0.12, -0.45]; } // jinjing paper bag di tangan kanan
  else { const s = e.swing * 0.55; T = [-s, -0.1, s, -0.1]; }
  const A = e.arm;
  for (let i = 0; i < 4; i++) A[i] += (T[i] - A[i]) * k;
  r.armL.rotation.x = A[0]; r.elbowL.rotation.x = A[1];
  r.armR.rotation.x = A[2]; r.elbowR.rotation.x = A[3];

  // Nampan hanya ada bila ada isinya, dan tidak pernah dipakai untuk pesanan dibungkus.
  const onTray = e.holdBread || e.holdCup || !!e.plate; // plate = piring bekas, tetap ada setelah roti habis
  r.hold.visible = onTray && !e.bag;
  if (r.plateItem) r.plateItem.visible = e.holdBread || !!e.plate;
  if (r.bagItem) r.bagItem.visible = e.holdBread;
  if (r.cupItem) r.cupItem.visible = e.holdCup;
  r.hold.position.set(0, lerp(0.32, 0.21, sit), lerp(0.48, 0.62, sit)); // di tangan / di atas meja

  // Peti (sopir) dan loyang (pembakar)
  if (r.crateItem) {
    r.crateItem.visible = e.holdCrate > 0;
    for (let i = 0; i < 3; i++) if (r['crate' + i]) r['crate' + i].visible = i < e.holdCrate;
  }
  if (r.bakeTray) r.bakeTray.visible = !!e.holdBake;

  // Paper bag (bawa pulang): selalu tegak menggantung, sedikit mengayun saat berjalan
  const bag = e.bag;
  if (r.takeBag) {
    r.takeBag.visible = !!bag;
    if (bag) {
      r.bagBun.visible = !!bag.bread;
      r.bagCup.visible = !!bag.cup;
      r.takeBag.rotation.x = -(A[2] + A[3]) + (e.moving ? Math.sin(e.phase + 1) * 0.08 : 0);
    }
  }
  if (e.sayUntil && t > e.sayUntil) { r.setSay?.(null); e.sayUntil = 0; }
}

// Balon ucapan; S harus punya S.t (waktu simulasi)
export const say = (S, e, text, dur) => { e.rig.setSay?.(text); e.sayUntil = S.t + dur; };

// Jalankan antrean tugas sebuah entitas (K.tasks): 'walk' (jalan) atau 'do' (aksi dengan durasi).
// Tiap tugas boleh punya start() / end(). routeFn(from, to) menghasilkan titik-titik jalur.
export function runTasks(K, dt, routeFn = (f, t) => [t]) {
  if (!K.cur && K.tasks.length) {
    const nt = (K.cur = K.tasks.shift());
    nt.t = 0;
    if (nt.k === 'walk') K.path = routeFn([K.x, K.z], nt.to);
    nt.start?.();
  }
  const T = K.cur;
  K.anim = null;
  if (!T) { follow(K, dt); return; }
  if (T.k === 'walk') {
    follow(K, dt);
    if (!K.path.length) { if (T.face !== undefined) K.targetFace = T.face; K.cur = null; T.end?.(); }
  } else {
    K.moving = false; K.anim = T.anim; K.targetFace = T.face;
    T.t += dt;
    // until(): menunggu kondisi (mis. barista siap), dengan batas waktu max agar tidak pernah macet
    const done = T.until ? (T.until() || T.t >= (T.max ?? 20)) : T.t >= T.d;
    if (done) { T.end?.(); K.cur = null; }
  }
}