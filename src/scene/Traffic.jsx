import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore.js';
import { M } from '../objects/materials.js';
import Person from '../objects/Person.jsx';
import { TRAFFIC as TR, LANES, SIM, DOOR, OUTLET, DOORSENS } from './layout.js';
import { traffic, zebraClear } from './traffic.js';
import { clockRate } from './simClock.js';
import {
  PI, HALF, WALK, rand, pick, angDiff, mkEntity, applyPose, runTasks, say,
  crowdAdd, crowdDel, doorReport, wantsDoor,
} from './actors.js';

/* ============ Lalu lintas sekitar (dekor DATA DEMO) ============
   Kendaraan lain : mobil & motor di lajur seberang (arah barat), saling menjaga jarak, berhenti di garis zebra
   Penyeberang    : pejalan menunggu di tepi jalan, menyeberang bila aman, lalu pergi
   Ojol           : motor parkir di depan Outlet, kurir mengambil bag di meja pickup (HANYA VISUAL: tidak mengubah stok/omzet)
   Aturan bersama dengan truk pengantar ada di scene/traffic.js. Tanpa cahaya titik, tanpa data baru. */

const PEOPLE = {
  shirts: ['#6B7A8F', '#8FA58A', '#C98B6B', '#7E6B8F', '#D6C28A', '#5E8C8A', '#B05A5A', '#4F6D9C'],
  pants: ['#2F3A4A', '#3D3A36', '#4A5A6A', '#5B4636', '#222222'],
  skins: ['#F0C9A4', '#E0AC84', '#C68B62', '#9A6A48', '#6F4A33'],
  hairs: ['#151515', '#2B1B12', '#4A3020', '#7A5A38', '#B58B4C'],
};
const CAR_COLORS = ['#2F5D50', '#C9B79C', '#3A4F6B', '#7A2E2E', '#E7E1D6', '#5B5B63'];
const HELMETS = ['#B05A5A', '#3A4F6B', '#D6C28A', '#5E8C8A', '#E7E1D6'];
const TEAL = '#2F7D6B';
const WR_CAR = 0.15, WR_MOTO = 0.17;
const STOP_X = TR.zebraX + TR.stopDX;
const LZ = TR.laneZ;

// Jalur kendaraan: ambient = lurus di lajur seberang. Ojol: masuk dari lajur seberang ke tepi jalan, lalu pulang lewat lajur yang sama.
const AMBIENT = [[TR.startX, LZ], [TR.endX, LZ]];
const IN_PTS = [[TR.startX, LZ], [16.4, LZ], [14.6, 11.7], [13.2, 10.6], [TR.ojol.park[0], TR.ojol.park[1]]];
const OUT_PTS = [[TR.ojol.park[0], TR.ojol.park[1]], [11.2, 10.6], [9.9, 11.7], [8.4, LZ], [TR.endX, LZ]];

const roadFree = () => traffic.truck.stage === 'idle' || traffic.truck.stage === 'load';

/* ---------- Model kendaraan (primitif) ---------- */
function Vehicle({ slot, night }) {
  const mats = useMemo(() => ({
    body: new THREE.MeshLambertMaterial({ color: '#2F5D50' }),
    shirt: new THREE.MeshLambertMaterial({ color: '#6B7A8F' }),
    helmet: new THREE.MeshLambertMaterial({ color: '#B05A5A' }),
  }), []);
  slot.mats = mats;
  if (!slot.carWheels) { slot.carWheels = []; slot.motoWheels = []; }
  const ref = (k) => (el) => { slot[k] = el; };
  const wheel = (arr, i) => (el) => { slot[arr][i] = el; };
  const head = night ? '#FFE7A3' : '#F4EBDD';
  const WIN = '#25323A';
  return (
    <group ref={ref('g')} visible={false}>
      {/* ===== Mobil kecil (depan = +x) ===== */}
      <group ref={ref('car')} visible={false}>
        <mesh position={[0.05, 0.015, 0]} rotation={[-PI / 2, 0, 0]} material={M.shadow}><planeGeometry args={[2.3, 1.05]} /></mesh>
        <mesh position={[0, 0.36, 0]} material={mats.body}><boxGeometry args={[1.9, 0.34, 0.8]} /></mesh>
        <mesh position={[-0.15, 0.68, 0]} material={mats.body}><boxGeometry args={[1.0, 0.3, 0.7]} /></mesh>
        <mesh position={[-0.15, 0.7, 0]}><boxGeometry args={[0.82, 0.2, 0.74]} /><meshLambertMaterial color={WIN} /></mesh>
        <mesh position={[0.36, 0.7, 0]}><boxGeometry args={[0.04, 0.2, 0.62]} /><meshLambertMaterial color={WIN} /></mesh>
        <mesh position={[-0.15, 0.845, 0]} material={M.cream}><boxGeometry args={[0.96, 0.04, 0.66]} /></mesh>
        {[1, -1].map((d) => (
          <group key={d}>
            <mesh position={[0.96, 0.38, d * 0.27]}><boxGeometry args={[0.03, 0.1, 0.16]} /><meshBasicMaterial color={head} /></mesh>
            <mesh position={[-0.96, 0.38, d * 0.29]}><boxGeometry args={[0.03, 0.1, 0.14]} /><meshBasicMaterial color="#D63B3B" /></mesh>
          </group>
        ))}
        {[[0.6, 0.42], [0.6, -0.42], [-0.6, 0.42], [-0.6, -0.42]].map(([x, z], i) => (
          <group key={i} position={[x, WR_CAR, z]} ref={wheel('carWheels', i)}>
            <mesh rotation={[PI / 2, 0, 0]} material={M.ink}><cylinderGeometry args={[WR_CAR, WR_CAR, 0.1, 12]} /></mesh>
            <mesh position={[0.05, 0, z > 0 ? 0.052 : -0.052]} material={M.gold}><boxGeometry args={[0.05, 0.04, 0.01]} /></mesh>
          </group>
        ))}
      </group>

      {/* ===== Motor + pengendara (depan = +x) ===== */}
      <group ref={ref('moto')} visible={false}>
        <mesh position={[0, 0.015, 0]} rotation={[-PI / 2, 0, 0]} material={M.shadow}><planeGeometry args={[1.6, 0.5]} /></mesh>
        {[[-0.4, 0], [0.42, 1]].map(([x], i) => (
          <group key={i} position={[x, WR_MOTO, 0]} ref={wheel('motoWheels', i)}>
            <mesh rotation={[PI / 2, 0, 0]} material={M.ink}><cylinderGeometry args={[WR_MOTO, WR_MOTO, 0.07, 14]} /></mesh>
            <mesh position={[0.06, 0, 0.04]} material={M.gold}><boxGeometry args={[0.05, 0.04, 0.01]} /></mesh>
          </group>
        ))}
        <mesh position={[-0.05, 0.38, 0]} material={mats.body}><boxGeometry args={[0.7, 0.16, 0.18]} /></mesh>
        <mesh position={[0.14, 0.5, 0]} material={mats.body}><boxGeometry args={[0.3, 0.14, 0.2]} /></mesh>
        <mesh position={[-0.22, 0.52, 0]} material={M.ink}><boxGeometry args={[0.5, 0.07, 0.2]} /></mesh>
        <mesh position={[0.37, 0.4, 0]} rotation={[0, 0, 0.3]} material={M.ink}><boxGeometry args={[0.04, 0.42, 0.06]} /></mesh>
        <mesh position={[0.32, 0.66, 0]} material={M.ink}><boxGeometry args={[0.05, 0.04, 0.4]} /></mesh>
        <mesh position={[0.43, 0.58, 0]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color={head} /></mesh>
        <mesh position={[-0.52, 0.5, 0]}><boxGeometry args={[0.03, 0.06, 0.12]} /><meshBasicMaterial color="#D63B3B" /></mesh>
        {/* boks pengantar (hanya motor ojol) */}
        <group ref={ref('box')} visible={false}>
          <mesh position={[-0.56, 0.9, 0]}><boxGeometry args={[0.44, 0.44, 0.44]} /><meshLambertMaterial color={TEAL} /></mesh>
          <mesh position={[-0.56, 1.13, 0]} material={M.cream}><boxGeometry args={[0.46, 0.03, 0.46]} /></mesh>
        </group>
        {/* pengendara */}
        <group ref={ref('rider')}>
          <mesh position={[-0.12, 0.88, 0]} rotation={[0, 0, -0.15]} material={mats.shirt}><boxGeometry args={[0.2, 0.42, 0.28]} /></mesh>
          <mesh position={[0.0, 1.22, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshLambertMaterial color="#D4A073" /></mesh>
          <mesh position={[0.0, 1.24, 0]} material={mats.helmet}><sphereGeometry args={[0.125, 12, 8, 0, PI * 2, 0, PI * 0.62]} /></mesh>
          {[1, -1].map((d) => (
            <group key={d}>
              <mesh position={[0.1, 0.8, d * 0.17]} rotation={[0, 0, -0.5]} material={mats.shirt}><boxGeometry args={[0.5, 0.06, 0.06]} /></mesh>
              <mesh position={[0.0, 0.46, d * 0.15]} rotation={[0, 0, 0.35]} material={M.dark}><boxGeometry args={[0.1, 0.4, 0.1]} /></mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

// Meja pickup ojol di dalam Outlet (kiri pintu). Paper bag muncul saat motor ojol tiba (traffic.ojolReady)
function OjolShelf() {
  const bag = useRef();
  useFrame(() => { if (bag.current && bag.current.visible !== traffic.ojolReady) bag.current.visible = traffic.ojolReady; });
  const [x, z] = TR.ojol.shelf;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.42, 0]} material={M.cream}><boxGeometry args={[0.9, 0.84, 0.5]} /></mesh>
      <mesh position={[0, 0.86, 0]} material={M.marun}><boxGeometry args={[0.96, 0.04, 0.56]} /></mesh>
      <mesh position={[0, 0.12, -0.255]} material={M.gold}><boxGeometry args={[0.9, 0.03, 0.01]} /></mesh>
      <group ref={bag} position={[0, 0.88, 0]} visible={false}>
        <mesh position={[0, 0.13, 0]}><boxGeometry args={[0.2, 0.26, 0.12]} /><meshLambertMaterial color="#C9A06A" /></mesh>
        <mesh position={[0, 0.27, 0]}><boxGeometry args={[0.21, 0.04, 0.13]} /><meshLambertMaterial color="#B88B55" /></mesh>
        <mesh position={[0, 0.13, -0.062]} material={M.ink}><circleGeometry args={[0.04, 14]} /></mesh>
      </group>
      <Html position={[0, 1.3, 0]} center pointerEvents="none"><div className="zonetag">OJOL · DEMO</div></Html>
    </group>
  );
}

/* ---------- Kendaraan ---------- */
function spawnVehicle(S, slot, type, mode, pts, extra = {}) {
  const speed = type === 'car' ? TR.carSpeed : TR.motorSpeed;
  const vmax = extra.vmax ?? rand(speed[0], speed[1]);
  const m = slot.mats;
  if (extra.ojol) { m.body.color.set(TEAL); m.shirt.color.set(TEAL); m.helmet.color.set('#F4EFE6'); }
  else { m.body.color.set(pick(CAR_COLORS)); m.shirt.color.set(pick(PEOPLE.shirts)); m.helmet.color.set(pick(HELMETS)); }
  const h0 = Math.atan2(-(pts[1][1] - pts[0][1]), pts[1][0] - pts[0][0]);
  const v = {
    slot, type, mode, x: pts[0][0], z: pts[0][1], h: h0, v: 0.7 * vmax, vmax, len: type === 'car' ? 2.0 : 1.2,
    pts, pi: 1, odo: 0, hold: false, faceTo: PI, ojol: false, ...extra,
  };
  slot.v = v;
  traffic.veh.push(v);
  return v;
}

function dropVeh(S, v) {
  const i = traffic.veh.indexOf(v);
  if (i >= 0) traffic.veh.splice(i, 1);
  v.slot.v = null;
  if (v.slot.g) v.slot.g.visible = false;
  if (S.ojol.v === v) { S.ojol.v = null; S.ojol.active = false; }
}

// Satu langkah: kecepatan target (jaga jarak, garis zebra, parkir) -> percepatan -> maju sepanjang jalur
function stepVehicle(S, v, dt) {
  let tv = v.hold ? 0 : v.vmax;
  if (!v.hold) {
    for (const o of traffic.veh) {
      if (o === v || o.x >= v.x || v.x - o.x > 14 || Math.abs(o.z - v.z) > 0.85) continue;
      const gap = v.x - o.x - (v.len + o.len) / 2 - TR.stopGap;
      tv = Math.min(tv, Math.sqrt(2 * TR.decel * Math.max(0, gap)));
    }
    if (traffic.zebraBusy && Math.abs(v.z - LZ) < 1.3) {
      const front = v.x - v.len / 2;
      if (front > STOP_X - 0.05) tv = Math.min(tv, Math.sqrt(2 * TR.decel * Math.max(0, front - STOP_X)));
    }
  }
  const dv = tv - v.v;
  v.v = dv >= 0 ? v.v + Math.min(dv, TR.accel * dt) : v.v + Math.max(dv, -TR.decel * 1.2 * dt);
  if (v.v < 0.01) v.v = 0;

  let step = v.v * dt;
  while (step > 0 && v.pi < v.pts.length) {
    const [px, pz] = v.pts[v.pi], dx = px - v.x, dz = pz - v.z, d = Math.hypot(dx, dz);
    if (d <= step) { v.x = px; v.z = pz; step -= d; v.pi += 1; }
    else { v.x += (dx / d) * step; v.z += (dz / d) * step; step = 0; }
  }
  v.odo += v.v * dt;

  let th = v.faceTo;
  if (v.pi < v.pts.length) {
    const dx = v.pts[v.pi][0] - v.x, dz = v.pts[v.pi][1] - v.z;
    if (Math.hypot(dx, dz) > 0.05) th = Math.atan2(-dz, dx);
  }
  v.h += angDiff(v.h, th) * Math.min(1, dt * 7);
  return v.pi >= v.pts.length;
}

function showVeh(v) {
  const s = v.slot;
  if (!s.g) return;
  s.g.visible = true;
  s.g.position.set(v.x, 0, v.z);
  s.g.rotation.y = v.h;
  const car = v.type === 'car';
  if (s.car) s.car.visible = car;
  if (s.moto) s.moto.visible = !car;
  const wr = car ? WR_CAR : WR_MOTO;
  (car ? s.carWheels : s.motoWheels).forEach((w) => { if (w) w.rotation.z = -v.odo / wr; });
  if (!car) {
    if (s.rider) s.rider.visible = v.mode !== 'park'; // kurir turun -> pengendara tidak ada di motor
    if (s.box) s.box.visible = !!v.ojol;
  }
}

/* ---------- Pejalan penyeberang ---------- */
function despawnPed(S, e) {
  S.peds = S.peds.filter((p) => p !== e);
  crowdDel(e);
  e.crossing = false;
  e.rig.busy = false;
  if (e.rig.root) e.rig.root.visible = false;
}

function spawnPed(S) {
  const rig = S.pedRigs.find((r) => !r.busy);
  if (!rig || !rig.mats) return false;
  const P = TR.ped, ZX = TR.zebraX;
  const side = Math.random() < 0.5 ? -1 : 1, toBack = Math.random() < 0.5;
  const m = rig.mats;
  m.shirt.color.set(pick(PEOPLE.shirts)); m.pants.color.set(pick(PEOPLE.pants));
  m.skin.color.set(pick(PEOPLE.skins)); m.hair.color.set(pick(PEOPLE.hairs));
  const x0 = ZX + side * P.span, x1 = ZX - side * P.span;
  const e = mkEntity(rig, x0, toBack ? P.walkF : P.walkB, side > 0 ? -HALF : HALF);
  e.tasks = []; e.cur = null; e.speed = WALK * rand(0.95, 1.1); e.prio = 1; e.crossing = false;
  const lane = ZX + (toBack ? P.laneGo : P.laneBack);
  const curbA = toBack ? P.curbF : P.curbB, curbB = toBack ? P.curbB : P.curbF;
  const face = toBack ? 0 : PI;
  e.tasks.push(
    { k: 'walk', to: [lane, curbA], face },
    { k: 'do', d: 0, face, until: zebraClear, max: 90 }, // menunggu sampai aman
    { k: 'walk', to: [lane, curbB], face, start: () => { e.crossing = true; }, end: () => { e.crossing = false; } },
    { k: 'walk', to: [x1, toBack ? P.walkB : P.walkF], face: x1 > lane ? HALF : -HALF, end: () => despawnPed(S, e) },
  );
  rig.busy = true;
  if (rig.root) rig.root.visible = true;
  S.peds.push(e);
  return true;
}

/* ---------- Ojol ---------- */
const canDepart = (v) => traffic.truck.stage !== 'back'
  && !traffic.veh.some((o) => o !== v && o.mode !== 'park' && o.x > 5 && o.x < TR.startX + 6);

function startCourier(S, v) {
  const C = S.C, O = TR.ojol, T = (C.tasks = []);
  const walk = (to, face, o = {}) => T.push({ k: 'walk', to, face, ...o });
  const act = (d, anim, face, o = {}) => T.push({ k: 'do', d, anim, face, ...o });
  C.cur = null; C.path = []; C.moving = false; C.bag = null;
  C.x = O.dismount[0]; C.z = O.dismount[1]; C.face = C.targetFace = PI;
  if (C.rig.root) C.rig.root.visible = true;
  traffic.ojolReady = true;
  S.courier = { active: true, done: false };
  walk([SIM.doorInX, LANES.walkW], PI);                 // ke celah pot, lurus ke pintu masuk
  walk([SIM.doorInX, LANES.inW], PI);                   // masuk lewat lajur masuk
  walk([O.stand[0], LANES.inW], -HALF);                 // menyusur lajur barat dalam ke meja pickup
  walk(O.stand, 0);
  act(1.2, 'lift', 0, {
    start: () => say(S, C, 'Ojol: ambil pesanan', 1.6),
    end: () => { traffic.ojolReady = false; C.bag = { bread: true, cup: true }; },
  });
  walk([O.stand[0], LANES.inE], PI);                    // pulang lewat lajur timur dalam
  walk([SIM.doorOutX, LANES.inE], HALF);
  walk([SIM.doorOutX, LANES.walkE], 0);                 // keluar lewat lajur keluar pintu
  walk([O.dismount[0], O.dismount[1]], HALF);
  act(0.8, 'hand', 0, { end: () => { C.bag = null; S.courier.done = true; } });
}

function resetAll(S) {
  traffic.veh.slice().forEach((v) => dropVeh(S, v));
  S.peds.slice().forEach((p) => despawnPed(S, p));
  S.ojol = { active: false, v: null, t: 0 };
  traffic.ojolReady = false; traffic.zebraBusy = false;
  const C = S.C;
  C.cur = null; C.tasks.length = 0; C.path = []; C.bag = null;
  if (C.rig.root) C.rig.root.visible = false;
  S.courier = { active: false, done: false };
}

export default function Traffic({ night, low }) {
  const invalidate = useThree((s) => s.invalidate);
  const sim = useStore((s) => s.sim);
  const maxCars = low ? 1 : TR.maxCars;
  const slots = useMemo(() => Array.from({ length: maxCars + 1 }, (_, i) => ({ i, v: null })), [maxCars]); // +1 slot untuk ojol
  const pedRigs = useMemo(() => Array.from({ length: low ? 1 : TR.maxPeds }, () => ({ busy: false })), [low]);
  const courierRig = useMemo(() => ({}), []);
  const world = useRef(null);
  if (!world.current) {
    const C = mkEntity(courierRig, TR.ojol.dismount[0], TR.ojol.dismount[1], PI);
    C.tasks = []; C.cur = null; C.speed = WALK * 1.2; C.prio = 1;
    world.current = {
      t: 0, nextCar: 2, nextPed: 6, nextOjol: 20, peds: [], C,
      courier: { active: false, done: false }, ojol: { active: false, v: null, t: 0 },
    };
  }
  world.current.slots = slots; world.current.pedRigs = pedRigs; world.current.maxCars = maxCars;

  // Daftarkan kurir ke registri anti-tabrakan; reset keadaan bersama saat dipasang; bersihkan saat dilepas
  useEffect(() => {
    const S = world.current, m = courierRig.mats;
    traffic.veh.length = 0; traffic.truck.stage = 'idle'; traffic.zebraBusy = false; traffic.ojolReady = false;
    crowdAdd(S.C);
    if (m) { m.shirt.color.set(TEAL); m.pants.color.set('#2B2B2B'); m.skin.color.set('#C68B62'); m.hair.color.set('#1B1B1B'); }
    if (courierRig.root) courierRig.root.visible = false;
    pedRigs.forEach((r) => { if (r.root) r.root.visible = false; });
    return () => { S.peds.forEach(crowdDel); crowdDel(S.C); traffic.veh.length = 0; traffic.zebraBusy = false; traffic.ojolReady = false; };
  }, [courierRig, pedRigs]);

  // Bangunkan loop saat simulasi dihidupkan (mode render on-demand)
  useEffect(() => { invalidate(); }, [sim, invalidate]);

  useFrame((_, delta) => {
    const S = world.current, C = S.C, enabled = useStore.getState().sim;
    const busy = traffic.veh.length > 0 || S.peds.length > 0 || S.courier.active;
    if (!enabled && !busy) { doorReport('ojol', 0, 99); traffic.zebraBusy = false; return; } // diam -> tidak render ulang
    const dt = Math.min(delta, 0.05);
    S.t += dt;

    try {
      const open = clockRate() > 0, free = roadFree();

      // ---- kemunculan ----
      if (enabled) {
        if (S.t >= S.nextCar) {
          S.nextCar = S.t + rand(TR.carEvery[0], TR.carEvery[1]) * (open ? 1 : 2.2);
          const slot = S.slots.find((s) => !s.v);
          const ambient = traffic.veh.filter((v) => v.mode === 'ambient').length;
          if (free && slot && ambient < S.maxCars && !traffic.veh.some((o) => o.x > TR.startX - TR.spawnGap)) {
            spawnVehicle(S, slot, Math.random() < 0.5 ? 'car' : 'moto', 'ambient', AMBIENT);
          }
        }
        if (S.t >= S.nextPed) {
          S.nextPed = S.t + rand(TR.pedEvery[0], TR.pedEvery[1]) * (open ? 1 : 2.5);
          if (free && S.peds.length < S.pedRigs.length) spawnPed(S);
        }
        if (S.t >= S.nextOjol) {
          const slot = S.slots.find((s) => !s.v);
          if (open && free && slot && !S.ojol.active && !traffic.veh.some((o) => o.x > TR.startX - TR.spawnGap - 2)) {
            const v = spawnVehicle(S, slot, 'moto', 'in', IN_PTS, { ojol: true, vmax: 4.4 });
            S.ojol = { active: true, v, t: 0 };
            S.nextOjol = S.t + rand(TR.ojolEvery[0], TR.ojolEvery[1]);
          } else S.nextOjol = S.t + 5;
        }
      }

      // ---- pejalan & kurir ----
      S.peds.slice().forEach((e) => runTasks(e, dt));
      traffic.zebraBusy = S.peds.some((p) => p.crossing);
      if (S.courier.active) runTasks(C, dt);

      // ---- kendaraan ----
      traffic.veh.slice().forEach((v) => {
        const done = stepVehicle(S, v, dt);
        if (done) {
          if (v.mode === 'in') { v.mode = 'park'; v.hold = true; v.v = 0; startCourier(S, v); }
          else if (v.mode !== 'park') { dropVeh(S, v); return; }
        }
        showVeh(v);
      });

      // ---- ojol: kurir selesai -> motor pergi bila jalan aman; pengaman waktu ----
      const O = S.ojol;
      if (O.active) {
        O.t += dt;
        const v = O.v;
        if (v && v.mode === 'park' && S.courier.done && canDepart(v)) {
          v.mode = 'out'; v.pts = OUT_PTS; v.pi = 1; v.hold = false; v.vmax = 4.4;
          S.courier.active = false;
          if (C.rig.root) C.rig.root.visible = false;
        }
        if (O.t > 150) resetAll(S);
      }

      // ---- sensor pintu Outlet untuk kurir ----
      const vis = !!C.rig.root?.visible;
      doorReport('ojol', vis && wantsDoor(C, DOOR.x, OUTLET.zF, DOORSENS.range) ? 1 : 0, Math.hypot(C.x - DOOR.x, C.z - OUTLET.zF));
    } catch (err) {
      console.error('[Lalu lintas]', err);
      resetAll(S);
    }

    // Pose tiap orang diterapkan terpisah: satu error tidak menghentikan yang lain
    const pose = (e) => {
      try { applyPose(e, dt, S.t); }
      catch (err) { if (!S.warned) { S.warned = true; console.error('[Pose lalu lintas]', err); } }
    };
    S.peds.forEach(pose);
    if (C.rig.root?.visible) pose(C);
    invalidate();
  });

  return (
    <>
      {slots.map((s) => <Vehicle key={s.i} slot={s} night={night} />)}
      {pedRigs.map((rig, i) => <Person key={`p${i}`} rig={rig} />)}
      <Person rig={courierRig} />
      <OjolShelf />
    </>
  );
}