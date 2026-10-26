import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { M } from './materials.js';

export const HIP = 0.92;       // tinggi pinggul saat berdiri
export const SEAT_HIP = 0.56;  // tinggi pinggul saat duduk
const TAU = Math.PI * 2;
const GLASS = new THREE.MeshLambertMaterial({ color: '#EAF2F4', transparent: true, opacity: 0.55, depthWrite: false });

// Figur low-poly (tinggi ±1,7). Tidak punya logika: semua sendi digerakkan lewat objek `rig`
// (ref ke tiap sendi) oleh scene/actors.js. Warna diganti lewat rig.mats.*.color.
// outfit: 'none' (pelanggan) | 'cashier' | 'chef' (pekerja produksi) | 'driver'
export default function Person({ rig, shown = false, outfit = 'none' }) {
  const mats = useMemo(() => ({
    shirt: new THREE.MeshLambertMaterial({ color: '#8A9BB0' }),
    pants: new THREE.MeshLambertMaterial({ color: '#2F3A4A' }),
    skin: new THREE.MeshLambertMaterial({ color: '#E0AC84' }),
    hair: new THREE.MeshLambertMaterial({ color: '#1B1B1B' }),
    bun: new THREE.MeshLambertMaterial({ color: '#D9A66B' }),       // roti di loyang
    crate0: new THREE.MeshLambertMaterial({ color: '#D9A441' }),    // warna peti yang dibawa
    crate1: new THREE.MeshLambertMaterial({ color: '#B9783F' }),
    crate2: new THREE.MeshLambertMaterial({ color: '#6F8794' }),
    drink: new THREE.MeshLambertMaterial({ color: '#9A6A45' }),    // isi gelas (warna mengikuti varian minuman)
  }), []);
  rig.mats = mats;
  const cashier = outfit === 'cashier', chef = outfit === 'chef', driver = outfit === 'driver', barista = outfit === 'barista';
  const [say, setSay] = useState(null); // balon ucapan
  useEffect(() => {
    rig.setSay = setSay;
    if (rig.root) rig.root.visible = shown;
    return () => { rig.setSay = null; };
  }, [rig, shown]);
  const ref = (k) => (el) => { rig[k] = el; };

  return (
    <group ref={ref('root')}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={M.shadow}><circleGeometry args={[0.3, 14]} /></mesh>
      <group ref={ref('body')} position={[0, HIP, 0]}>
        {/* kaki: paha + betis + sepatu */}
        {[['L', -1], ['R', 1]].map(([n, s]) => (
          <group key={n} ref={ref('leg' + n)} position={[s * 0.085, 0, 0]}>
            <mesh position={[0, -0.21, 0]} material={mats.pants}><boxGeometry args={[0.13, 0.42, 0.14]} /></mesh>
            <group ref={ref('knee' + n)} position={[0, -0.42, 0]}>
              <mesh position={[0, -0.25, 0]} material={mats.pants}><boxGeometry args={[0.11, 0.5, 0.12]} /></mesh>
              <mesh position={[0, -0.47, 0.04]} material={M.ink}><boxGeometry args={[0.11, 0.06, 0.2]} /></mesh>
            </group>
          </group>
        ))}
        {/* badan */}
        <mesh position={[0, 0.0, 0]} material={mats.pants}><boxGeometry args={[0.33, 0.14, 0.19]} /></mesh>
        <mesh position={[0, 0.28, 0]} material={mats.shirt}><boxGeometry args={[0.34, 0.54, 0.2]} /></mesh>
        {(cashier || chef) && (
          <>
            <mesh position={[0, 0.2, 0.108]} material={cashier ? M.marun : barista ? M.ink : M.cream}><boxGeometry args={[0.31, 0.42, 0.02]} /></mesh>
            <mesh position={[0, 0.47, 0.108]} material={cashier ? M.marun : barista ? M.ink : M.cream}><boxGeometry args={[0.2, 0.14, 0.02]} /></mesh>
            <mesh position={[0.075, 0.4, 0.122]} material={M.gold}><boxGeometry args={[0.06, 0.03, 0.006]} /></mesh>
          </>
        )}
        {chef && <mesh position={[0, 0.0, 0.121]} material={M.marun}><boxGeometry args={[0.31, 0.03, 0.006]} /></mesh>}
        {driver && (
          <>
            <mesh position={[0, 0.3, 0]} material={M.marun}><boxGeometry args={[0.355, 0.4, 0.21]} /></mesh>
            <mesh position={[0, 0.34, 0.0]} material={M.gold}><boxGeometry args={[0.357, 0.04, 0.212]} /></mesh>
          </>
        )}
        <mesh position={[0, 0.58, 0]} material={mats.skin}><cylinderGeometry args={[0.045, 0.05, 0.07, 8]} /></mesh>
        {/* kepala */}
        <group ref={ref('head')} position={[0, 0.72, 0]}>
          <mesh material={mats.skin}><sphereGeometry args={[0.115, 14, 10]} /></mesh>
          <mesh position={[0, 0.012, -0.012]} rotation={[-0.15, 0, 0]} material={mats.hair}>
            <sphereGeometry args={[0.122, 14, 10, 0, TAU, 0, Math.PI * 0.56]} />
          </mesh>
          {[-1, 1].map((d) => (
            <mesh key={d} position={[d * 0.04, 0.012, 0.105]} material={M.ink}><sphereGeometry args={[0.014, 6, 6]} /></mesh>
          ))}
          {(cashier || driver) && (
            <>
              <mesh position={[0, 0.1, 0]} material={M.marun}><cylinderGeometry args={[0.125, 0.125, 0.07, 14]} /></mesh>
              <mesh position={[0, 0.07, 0.1]} material={M.marun}><boxGeometry args={[0.18, 0.012, 0.08]} /></mesh>
            </>
          )}
          {chef && (
            <>
              <mesh position={[0, 0.115, 0]} material={M.cream}><cylinderGeometry args={[0.115, 0.12, 0.08, 14]} /></mesh>
              <mesh position={[0, 0.2, 0]} scale={[1, 0.8, 1]} material={M.cream}><sphereGeometry args={[0.14, 14, 10]} /></mesh>
            </>
          )}
          {barista && (
            <>
              <mesh position={[0, 0.095, 0]} material={M.ink}><cylinderGeometry args={[0.122, 0.125, 0.06, 14]} /></mesh>
              <mesh position={[0, 0.068, 0.105]} material={M.ink}><boxGeometry args={[0.18, 0.012, 0.08]} /></mesh>
            </>
          )}
        </group>
        {/* lengan: bahu -> siku */}
        {[['L', -1], ['R', 1]].map(([n, s]) => (
          <group key={n} ref={ref('arm' + n)} position={[s * 0.215, 0.5, 0]}>
            <mesh material={mats.shirt}><sphereGeometry args={[0.058, 8, 6]} /></mesh>
            <mesh position={[0, -0.14, 0]} material={mats.shirt}><boxGeometry args={[0.09, 0.3, 0.1]} /></mesh>
            <group ref={ref('elbow' + n)} position={[0, -0.29, 0]}>
              <mesh position={[0, -0.13, 0]} material={mats.skin}><boxGeometry args={[0.075, 0.27, 0.085]} /></mesh>
              <mesh position={[0, -0.28, 0]} material={mats.skin}><sphereGeometry args={[0.045, 8, 6]} /></mesh>

              {/* Paper bag bawa pulang: hanya di tangan kanan, menggantung dari tali jinjing */}
              {n === 'R' && (
                <group ref={ref('takeBag')} position={[0, -0.3, 0.02]} visible={false}>
                  <mesh><torusGeometry args={[0.032, 0.006, 6, 14]} /><meshLambertMaterial color="#8A6A3E" /></mesh>
                  <mesh position={[0, -0.14, 0]}><boxGeometry args={[0.15, 0.2, 0.09]} /><meshLambertMaterial color="#C9A06A" /></mesh>
                  <mesh position={[0, -0.045, 0]}><boxGeometry args={[0.156, 0.03, 0.096]} /><meshLambertMaterial color="#B88B55" /></mesh>
                  <mesh position={[0, -0.14, 0.046]} material={M.ink}><circleGeometry args={[0.032, 16]} /></mesh>
                  <mesh position={[0, -0.14, 0.047]} material={M.gold}><ringGeometry args={[0.032, 0.038, 16]} /></mesh>
                  <group ref={ref('bagBun')} visible={false}>
                    <mesh position={[-0.03, -0.03, 0]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.04, 10, 8]} /><meshLambertMaterial color="#D9A66B" /></mesh>
                  </group>
                  <group ref={ref('bagCup')} visible={false}>
                    <mesh position={[0.035, -0.02, 0]}><cylinderGeometry args={[0.036, 0.03, 0.06, 12]} /><meshLambertMaterial color="#6B1F23" /></mesh>
                    <mesh position={[0.04, 0.03, 0]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.004, 0.004, 0.09, 6]} /><meshLambertMaterial color="#3E8E8A" /></mesh>
                  </group>
                </group>
              )}
            </group>
          </group>
        ))}

        {/* Nampan saji (makan di tempat). Titik asal = permukaan bawah nampan, menghadap +z */}
        <group ref={ref('hold')} position={[0, 0.32, 0.48]} visible={false}>
          <mesh position={[0, 0.009, 0]} material={M.ink}><boxGeometry args={[0.5, 0.018, 0.34]} /></mesh>
          <mesh position={[0, 0.026, 0.164]} material={M.gold}><boxGeometry args={[0.5, 0.03, 0.012]} /></mesh>
          <mesh position={[0, 0.026, -0.164]} material={M.gold}><boxGeometry args={[0.5, 0.03, 0.012]} /></mesh>
          <mesh position={[0.244, 0.026, 0]} material={M.gold}><boxGeometry args={[0.012, 0.03, 0.34]} /></mesh>
          <mesh position={[-0.244, 0.026, 0]} material={M.gold}><boxGeometry args={[0.012, 0.03, 0.34]} /></mesh>
          <mesh position={[0, 0.0195, 0]} material={M.cream}><boxGeometry args={[0.44, 0.003, 0.28]} /></mesh>
          <mesh position={[0, 0.0215, 0.12]} material={M.marun}><boxGeometry args={[0.44, 0.002, 0.04]} /></mesh>
          <group position={[0.12, 0.0235, 0.095]} rotation={[0, 0.25, 0]}>
            <mesh position={[0, 0.006, 0]} material={M.cream}><boxGeometry args={[0.09, 0.012, 0.05]} /></mesh>
            <mesh position={[0, 0.0065, 0]} material={M.marun}><boxGeometry args={[0.02, 0.013, 0.052]} /></mesh>
          </group>
          <mesh position={[-0.213, 0.023, 0]} material={M.steel}><boxGeometry args={[0.012, 0.004, 0.17]} /></mesh>
          <mesh position={[-0.213, 0.023, 0.095]} material={M.steel}><boxGeometry args={[0.03, 0.004, 0.03]} /></mesh>

          <group ref={ref('plateItem')} position={[-0.09, 0.021, -0.01]} visible={false}>
            <mesh position={[0, 0.008, 0]}><cylinderGeometry args={[0.095, 0.07, 0.016, 20]} /><meshLambertMaterial color="#F8F1E7" /></mesh>
            <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.gold}><ringGeometry args={[0.07, 0.078, 24]} /></mesh>
            <group ref={ref('bagItem')} position={[0, 0.016, 0]} visible={false}>
              <mesh position={[0, 0.034, 0]} scale={[1, 0.68, 1]}><sphereGeometry args={[0.06, 14, 10]} /><meshLambertMaterial color="#D9A66B" /></mesh>
              <mesh position={[0, 0.034, 0]} scale={[1, 0.68, 1]}><sphereGeometry args={[0.063, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45]} /><meshLambertMaterial color="#8A5A36" /></mesh>
              {[[0.02, 0.07, 0.01], [-0.025, 0.066, -0.01], [0.0, 0.068, -0.03]].map(([x, y, z]) => (
                <mesh key={`${x}${z}`} position={[x, y, z]}><sphereGeometry args={[0.007, 6, 6]} /><meshLambertMaterial color="#FFF6DF" /></mesh>
              ))}
            </group>
          </group>

          <group ref={ref('cupItem')} position={[0.13, 0.021, -0.04]} visible={false}>
            <mesh position={[0, 0.075, 0]} material={GLASS}><cylinderGeometry args={[0.045, 0.033, 0.15, 14]} /></mesh>
            <mesh position={[0, 0.058, 0]} material={mats.drink}><cylinderGeometry args={[0.038, 0.03, 0.11, 14]} /></mesh>
            {[[0.012, 0.112, 0.006], [-0.014, 0.108, -0.008], [0.004, 0.118, -0.014]].map(([x, y, z]) => (
              <mesh key={`${x}${z}`} position={[x, y, z]} rotation={[0.4, 0.5, 0.2]}>
                <boxGeometry args={[0.02, 0.02, 0.02]} /><meshLambertMaterial color="#F4FBFD" transparent opacity={0.75} />
              </mesh>
            ))}
            <mesh position={[0, 0.156, 0]} material={M.marun}><cylinderGeometry args={[0.049, 0.049, 0.012, 14]} /></mesh>
            <mesh position={[0.008, 0.2, 0]} rotation={[0, 0, 0.12]}><cylinderGeometry args={[0.004, 0.004, 0.17, 6]} /><meshLambertMaterial color="#3E8E8A" /></mesh>
          </group>
        </group>

        {/* Tumpukan peti (sopir), maksimal 3. Warna tiap peti: rig.mats.crate0..2 */}
        <group ref={ref('crateItem')} position={[0, 0.3, 0.5]} visible={false}>
          {[0, 1, 2].map((i) => (
            <group key={i} ref={ref('crate' + i)} position={[0, 0.1 + i * 0.205, 0]} visible={false}>
              <mesh material={mats['crate' + i]}><boxGeometry args={[0.38, 0.2, 0.3]} /></mesh>
              <mesh position={[0, 0.1, 0]} material={M.cream}><boxGeometry args={[0.4, 0.02, 0.32]} /></mesh>
              <mesh position={[0, 0, 0.151]} material={M.gold}><boxGeometry args={[0.12, 0.05, 0.004]} /></mesh>
            </group>
          ))}
        </group>

        {/* Loyang panggang berisi roti (pembakar). Warna roti: rig.mats.bun */}
        <group ref={ref('bakeTray')} position={[0, 0.3, 0.5]} visible={false}>
          <mesh position={[0, 0.01, 0]} material={M.steel}><boxGeometry args={[0.5, 0.02, 0.36]} /></mesh>
          <mesh position={[0, 0.03, 0.174]} material={M.steel}><boxGeometry args={[0.5, 0.04, 0.012]} /></mesh>
          <mesh position={[0, 0.03, -0.174]} material={M.steel}><boxGeometry args={[0.5, 0.04, 0.012]} /></mesh>
          <mesh position={[0.244, 0.03, 0]} material={M.steel}><boxGeometry args={[0.012, 0.04, 0.36]} /></mesh>
          <mesh position={[-0.244, 0.03, 0]} material={M.steel}><boxGeometry args={[0.012, 0.04, 0.36]} /></mesh>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <mesh key={i} position={[-0.18 + (i % 4) * 0.12, 0.06, i < 4 ? -0.07 : 0.07]} scale={[1, 0.7, 1]} material={mats.bun}>
              <sphereGeometry args={[0.052, 10, 8]} />
            </mesh>
          ))}
        </group>
      </group>
      {say && (
        <Html position={[0, 2.05, 0]} center pointerEvents="none" zIndexRange={[14, 0]}>
          <div className="saybubble" aria-hidden="true">{say}</div>
        </Html>
      )}
    </group>
  );
}