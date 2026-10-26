import { M } from './materials.js';
import { useHoverSelect } from './useHoverSelect.js';

// Lemari etalase + kaca. Bay roti (Shelf) duduk di atasnya; klik lemari -> ringkasan etalase.
export default function Etalase({ locked }) {
  const [hover, bind] = useHoverSelect({ type: 'group', id: 'etalase' }, locked);
  return (
    <group position={[5, 0, -0.2]} {...bind}>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[6.8, 0.72, 0.8]} />
        <meshLambertMaterial color="#F8F1E7" emissive={hover ? '#B07A3A' : '#000000'} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.6, 0.41]} material={M.marun}><boxGeometry args={[6.8, 0.08, 0.03]} /></mesh>
      <mesh position={[0, 0.1, 0.41]} material={M.gold}><boxGeometry args={[6.8, 0.03, 0.03]} /></mesh>
      <mesh position={[0, 1.1, 0]} material={M.glass} raycast={() => null}><boxGeometry args={[6.8, 0.75, 0.8]} /></mesh>
      <mesh position={[0, 1.49, 0]} material={M.marun}><boxGeometry args={[6.9, 0.05, 0.86]} /></mesh>
      {[-3.4, 3.4].map((x) => (<mesh key={x} position={[x, 1.1, 0]} material={M.marun}><boxGeometry args={[0.05, 0.78, 0.82]} /></mesh>))}
    </group>
  );
}