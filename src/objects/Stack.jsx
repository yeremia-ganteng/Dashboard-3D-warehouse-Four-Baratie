import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { reducedMotion } from '../scene/capability.js';
import { getModel } from './Models.js';

// Material dibagi pakai ulang. Warna dari vertex color tiap model.
const MAT = {
  solid: new THREE.MeshLambertMaterial({ vertexColors: true }),
  liquid: new THREE.MeshLambertMaterial({ vertexColors: true }),
  glass: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false }),
};
const UP = new THREE.Vector3(0, 1, 0);

// Satu InstancedMesh per BAGIAN model (badan, kaca, cairan) -> draw call tetap sedikit.
// Jumlah item terisi ~ qty/kapasitas. Item terakhir: roti = tumbuh membesar,
// botol/galon = tinggi cairan naik (level isi mengikuti stok).
export default function Stack({ item, qty, cap, width, depth, baseY }) {
  const model = useMemo(() => getModel(item), [item]);
  const grid = useMemo(() => {
    const [fw, fd] = model.fp, s = model.scale;
    const cols = Math.max(1, Math.round((width - 0.12) / (fw * s)));
    const rows = Math.max(1, Math.min(model.maxRows, Math.round((depth - 0.1) / (fd * s))));
    return { cols, rows, cx: (width - 0.12) / cols, cz: (depth - 0.1) / rows };
  }, [model, width, depth]);

  const { cols, rows, cx, cz } = grid;
  const max = cols * rows;
  const target = qty <= 0 ? 0 : Math.min(max, Math.max(0.5, (qty / cap) * max));
  const meshes = useRef([]);
  const shown = useRef(0);
  const settled = useRef(false);
  const invalidate = useThree((s) => s.invalidate);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);

  const write = (v) => {
    if (!meshes.current[0]) return;
    const whole = Math.floor(v + 1e-4), n = Math.ceil(v - 1e-4);
    for (let i = 0; i < n; i++) {
      const f = i < whole ? 1 : Math.max(v - whole, 0.08);
      const col = i % cols, row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * cx;
      const z = ((rows - 1) / 2 - row) * cz;                    // isi dari baris depan dulu
      const j = model.jitter;                                    // variasi alami (deterministik)
      const yaw = j ? (((i * 7919) % 13) / 13 - 0.5) * j : 0;
      const dx = j ? (((i * 104729) % 17) / 17 - 0.5) * 0.02 : 0;
      tmp.q.setFromAxisAngle(UP, yaw);
      model.parts.forEach((p, k) => {
        const sc = model.scale;
        if (p.kind === 'liquid') tmp.s.set(sc, sc * f, sc);     // tinggi cairan = level stok
        else if (model.level) tmp.s.set(sc, sc, sc);
        else tmp.s.set(sc * f, sc * f, sc * f);                  // roti/kemasan terakhir tumbuh
        tmp.m.compose(tmp.p.set(x + dx, baseY, z), tmp.q, tmp.s);
        meshes.current[k].setMatrixAt(i, tmp.m);
      });
    }
    meshes.current.forEach((mesh) => { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; });
  };

  // Stok berubah -> mulai animasi (mode on-demand butuh invalidate eksplisit)
  useEffect(() => { settled.current = false; invalidate(); }, [target, max, invalidate]);

  useFrame((_, dt) => {
    if (settled.current) return;
    const diff = target - shown.current;
    shown.current = reducedMotion() || Math.abs(diff) < 0.02 ? target : shown.current + diff * Math.min(1, dt * 6);
    write(shown.current);
    if (shown.current === target) settled.current = true;
    invalidate();
  });

  return (
    <>
      {model.parts.map((p, k) => (
        <instancedMesh
          key={`${item.id}-${k}-${max}`}
          ref={(el) => { meshes.current[k] = el; }}
          args={[p.geo, MAT[p.kind], max]}
          count={0}
          frustumCulled={false}
        />
      ))}
    </>
  );
}