import { Canvas } from '@react-three/fiber';
import { useStore } from '../store/useStore.js';
import World from './World.jsx';
import CameraRig from './CameraRig.jsx';

export default function Scene({ quality, onFail }) {
  const night = useStore((s) => s.night);
  const low = quality === 'low';
  return (
    <Canvas
      frameloop="demand"                       // render hanya saat perlu (hemat baterai)
      dpr={low ? 1 : [1, 2]}                   // pixel ratio maks 2
      camera={{ fov: 35, near: 0.5, far: 200, position: [20, 18, 22] }}
      gl={{ antialias: !low, powerPreference: 'low-power' }}
      onCreated={({ gl }) =>
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail?.(); })
      }
    >
      <color attach="background" args={[night ? '#2A2224' : '#F8F1E7']} />
      {/* Intensitas disetel untuk pencahayaan fisik three r155+; naikkan/turunkan jika terlalu terang */}
      <ambientLight intensity={night ? 1.0 : 2.0} color={night ? '#B9B4D6' : '#ffffff'} />
      <directionalLight position={[8, 14, 10]} intensity={night ? 0.8 : 2.4} />
      <World night={night} low={low} />
      <CameraRig />
    </Canvas>
  );
}