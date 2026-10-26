import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SEATS, seatMess } from './serving.js';

// Piring + gelas bekas di meja yang belum dibersihkan. 2 InstancedMesh (2 draw call), diperbarui hanya saat daftar berubah.
const TOP = 0.77; // permukaan meja marmer

export default function TableMess() {
  const plates = useRef(), cups = useRef(), last = useRef('');
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const sig = seatMess.map((b) => (b ? 1 : 0)).join('');
    if (sig === last.current || !plates.current || !cups.current) return;
    last.current = sig;
    let n = 0;
    SEATS.forEach((s, i) => {
      if (!seatMess[i]) return;
      const px = s.tx + s.d * 0.22;
      plates.current.setMatrixAt(n, m.makeTranslation(px, TOP + 0.008, s.tz - 0.06));
      cups.current.setMatrixAt(n, m.makeTranslation(px, TOP + 0.05, s.tz + 0.13));
      n += 1;
    });
    plates.current.count = n; cups.current.count = n;
    plates.current.instanceMatrix.needsUpdate = true; cups.current.instanceMatrix.needsUpdate = true;
  });
  const max = SEATS.length;
  return (
    <>
      <instancedMesh ref={plates} args={[undefined, undefined, max]} count={0} frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[0.095, 0.07, 0.016, 18]} />
        <meshLambertMaterial color="#F1EADC" />
      </instancedMesh>
      <instancedMesh ref={cups} args={[undefined, undefined, max]} count={0} frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[0.04, 0.03, 0.1, 12]} />
        <meshLambertMaterial color="#B9A58D" />
      </instancedMesh>
    </>
  );
}