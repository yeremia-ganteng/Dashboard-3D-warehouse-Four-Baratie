import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '../store/useStore.js';
import { reducedMotion } from './capability.js';
import { setLabelDistance } from './labelLod.js';
import { pauseTour } from './tour.js';
import { POV } from './layout.js';
import { usePov, isPovOn, povPose } from './pov.js';

const P_OUT = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0 };

// Kamera terbang halus ke preset/objek. Sudut & jarak dibatasi. Mode POV: kamera mengikuti mata kasir/pelanggan.
export default function CameraRig() {
  const { camera, invalidate, size } = useThree();
  const controls = useRef();
  const anim = useRef(null);
  const first = useRef(true);
  const cam = useStore((s) => s.cam);
  const pov = usePov();
  const pc = useRef(null);
  if (!pc.current) {
    pc.current = { init: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), tp: new THREE.Vector3(), tl: new THREE.Vector3(), saved: null, orig: null };
  }

  // Masuk / keluar POV (harus dideklarasikan SEBELUM efek kamera di bawah): FOV & near diganti, pose lama dipulihkan saat keluar
  useEffect(() => {
    const p = pc.current, c = controls.current;
    if (pov.on) {
      if (!p.orig) {
        p.orig = { fov: camera.fov, near: camera.near };
        p.saved = { pos: camera.position.clone(), target: c ? c.target.clone() : new THREE.Vector3() };
      }
      camera.fov = POV.fov; camera.near = POV.near; camera.updateProjectionMatrix();
      p.init = false; anim.current = null;
    } else if (p.orig) {
      camera.fov = p.orig.fov; camera.near = p.orig.near; camera.updateProjectionMatrix();
      camera.position.copy(p.saved.pos);
      if (c) { c.target.copy(p.saved.target); c.update(); }
      p.orig = null; p.saved = null;
    }
    invalidate();
  }, [pov.on]); // eslint-disable-line

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const aspect = size.width / size.height;
    const fit = Math.min(2, Math.max(1, 1.25 / aspect)); // layar sempit -> mundur sedikit
    const look = new THREE.Vector3(...cam.look);
    const toPos = look.clone().addScaledVector(new THREE.Vector3(...cam.dir).normalize(), cam.dist * fit);
    if (first.current || reducedMotion()) {
      first.current = false;
      camera.position.copy(toPos); c.target.copy(look); c.update(); invalidate();
      return;
    }
    anim.current = { t: 0, fromPos: camera.position.clone(), fromLook: c.target.clone(), toPos, toLook: look };
    invalidate();
  }, [cam.n]); // eslint-disable-line

  useFrame((_, dt) => {
    if (isPovOn()) { // orang pertama: ikuti mata, halus
      setLabelDistance(30); // label stok ringkas (dan disembunyikan lewat CSS .pov-on)
      const p = pc.current;
      povPose(P_OUT);
      p.tp.set(P_OUT.px, P_OUT.py, P_OUT.pz);
      p.tl.set(P_OUT.lx, P_OUT.ly, P_OUT.lz);
      if (!p.init) {
        p.pos.copy(camera.position);
        p.look.copy(controls.current ? controls.current.target : p.tl);
        p.init = true;
      }
      const d = Math.min(dt, 0.05);
      p.pos.lerp(p.tp, 1 - Math.exp(-7 * d));
      p.look.lerp(p.tl, 1 - Math.exp(-9 * d));
      camera.position.copy(p.pos);
      camera.lookAt(p.look);
      if (p.pos.distanceToSquared(p.tp) > 1e-5 || p.look.distanceToSquared(p.tl) > 1e-5) invalidate();
      return;
    }
    if (controls.current) setLabelDistance(camera.position.distanceTo(controls.current.target)); // tingkat detail label stok
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 1.1);
    const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2; // easeInOutCubic
    camera.position.lerpVectors(a.fromPos, a.toPos, e);
    controls.current.target.lerpVectors(a.fromLook, a.toLook, e);
    controls.current.update();
    if (a.t >= 1) anim.current = null; else invalidate();
  });

  return (
    <OrbitControls
      ref={controls} makeDefault enablePan={false} enabled={!pov.on}
      minDistance={5} maxDistance={90}
      minPolarAngle={0.05} maxPolarAngle={1.25}
      minAzimuthAngle={-1.2} maxAzimuthAngle={1.2}
      onStart={() => { anim.current = null; pauseTour(); }}// drag pengguna membatalkan animasi & tur
    />
  );
}