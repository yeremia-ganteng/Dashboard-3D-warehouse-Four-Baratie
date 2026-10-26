import { M } from './materials.js';

// Meja adonan (dekor Unit Produksi)
export function DoughTable({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} material={M.steel}><boxGeometry args={[2, 0.08, 0.9]} /></mesh>
      {[[-0.9, -0.38], [0.9, -0.38], [-0.9, 0.38], [0.9, 0.38]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.45, z]} material={M.dark}><boxGeometry args={[0.06, 0.9, 0.06]} /></mesh>
      ))}
      <mesh position={[-0.5, 1, 0]} material={M.cream}><cylinderGeometry args={[0.22, 0.18, 0.14, 12]} /></mesh>
      <mesh position={[0.4, 0.98, 0.1]} rotation={[0, 0, Math.PI / 2]} material={M.wood}><cylinderGeometry args={[0.04, 0.04, 0.6, 8]} /></mesh>
      <mesh position={[0.1, 0.99, -0.15]} material={M.cream2}><sphereGeometry args={[0.13, 8, 6]} /></mesh>
    </group>
  );
}

// Rak pendingin (dekor): tray kosong menunggu dingin
export function CoolingRack({ position }) {
  return (
    <group position={position}>
      {[[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.85, z]} material={M.dark}><boxGeometry args={[0.05, 1.7, 0.05]} /></mesh>
      ))}
      {[0.3, 0.8, 1.3, 1.65].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={M.steel}><boxGeometry args={[1, 0.03, 0.55]} /></mesh>
      ))}
      <mesh position={[0, 1.7, 0]} material={M.marun}><boxGeometry args={[1.08, 0.05, 0.62]} /></mesh>
    </group>
  );
}

// Meja bulat marmer + 2 kursi hitam
export function TableSet({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.74, 0]} material={M.marble}><cylinderGeometry args={[0.5, 0.5, 0.06, 24]} /></mesh>
      <mesh position={[0, 0.37, 0]} material={M.ink}><cylinderGeometry args={[0.05, 0.05, 0.74, 8]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={M.ink}><cylinderGeometry args={[0.3, 0.3, 0.04, 16]} /></mesh>
      {[-1, 1].map((d) => (
        <group key={d} position={[d * 0.74, 0, 0]} rotation={[0, d > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh position={[0, 0.45, 0]} material={M.ink}><boxGeometry args={[0.42, 0.05, 0.42]} /></mesh>
          <mesh position={[0, 0.7, -0.19]} material={M.ink}><boxGeometry args={[0.42, 0.45, 0.04]} /></mesh>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => (
            <mesh key={`${a}${b}`} position={[a * 0.17, 0.22, b * 0.17]} material={M.ink}><boxGeometry args={[0.04, 0.44, 0.04]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Lampu gantung. Malam: bohlam menyala hangat (+ point light bila perangkat kuat)
export function Lamp({ position, night, light }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} material={M.ink}><cylinderGeometry args={[0.012, 0.012, 1.2, 4]} /></mesh>
      <mesh position={[0, 0.05, 0]} material={M.marun}><cylinderGeometry args={[0.06, 0.3, 0.25, 14]} /></mesh>
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshBasicMaterial color={night ? '#FFD38A' : '#EADFCB'} />
      </mesh>
      {light && <pointLight position={[0, -0.3, 0]} color="#FFB45E" intensity={40} distance={9} decay={2} />}
    </group>
  );
}