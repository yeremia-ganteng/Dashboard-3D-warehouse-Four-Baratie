import { M } from './materials.js';
import { GROUPS } from '../scene/layout.js';
import { useHoverSelect } from './useHoverSelect.js';
import OvenProgress from './OvenProgress.jsx';

// Oven: klik -> ringkasan roti baru jadi di Unit Produksi. Bar progres panggang ada di atasnya.
export default function Oven({ locked }) {
  const [hover, bind] = useHoverSelect({ type: 'group', id: 'oven' }, locked);
  const [ox, , oz] = GROUPS.oven.pos;
  const hv = hover ? '#B07A3A' : '#000000';
  return (
    <group position={[ox, 0, oz]} {...bind}>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[2.2, 1.5, 1]} /><meshLambertMaterial color="#2B2B2B" emissive={hv} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 1.55, 0]} material={M.marun}><boxGeometry args={[2.3, 0.12, 1.1]} /></mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.51]}>
          <boxGeometry args={[0.8, 0.55, 0.02]} /><meshBasicMaterial color="#FF9A3C" />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0.52]} material={M.gold}><boxGeometry args={[1.9, 0.04, 0.04]} /></mesh>
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.3, 0.52]} rotation={[Math.PI / 2, 0, 0]} material={M.steel}>
          <cylinderGeometry args={[0.05, 0.05, 0.05, 8]} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={M.shadow}><planeGeometry args={[2.5, 1.4]} /></mesh>
      <OvenProgress />
    </group>
  );
}