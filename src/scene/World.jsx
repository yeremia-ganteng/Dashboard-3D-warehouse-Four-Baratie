import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import { LAYOUT, SITE, INDOOR, OUT_X, OUT_Z, OUTLET, PROD_LAMPS } from './layout.js';
import { M } from '../objects/materials.js';
import Shelf from '../objects/Shelf.jsx';
import Oven from '../objects/Oven.jsx';
import Etalase from '../objects/Etalase.jsx';
import Counter from '../objects/Counter.jsx';
import Bar from '../objects/Bar.jsx';
import { DoughTable, CoolingRack, TableSet, Lamp } from '../objects/Furniture.jsx';
import Delivery from './Delivery.jsx';
import Customers from './Customers.jsx';
import Workers from './Workers.jsx';
import Site from './Site.jsx';
import Building from './Building.jsx';
import ProdBuilding from './ProdBuilding.jsx';
import OutletLights from './OutletLights.jsx';
import Walkways from './Walkways.jsx';
import Gudang from './Gudang.jsx';
import TableMess from './TableMess.jsx';
import Traffic from './Traffic.jsx';
import Restock from './Restock.jsx';

const { prodX } = SITE;
const PD = prodX + 5; // pergeseran dekor produksi dari koordinat lama

// Lantai + dinding belakang + label zona (Unit Produksi; Outlet punya Building sendiri)
function Zone({ cx, floor, tag }) {
  return (
    <group position={[cx, 0, 0]}>
      <mesh position={[0, -0.06, 0]} material={floor}><boxGeometry args={[8, 0.12, 8]} /></mesh>
      <mesh position={[0, 1.8, -4.05]} material={M.cream}><boxGeometry args={[8.2, 3.6, 0.15]} /></mesh>
      <mesh position={[0, 3.65, -4.03]} material={M.marun}><boxGeometry args={[8.3, 0.2, 0.25]} /></mesh>
      <mesh position={[0, 0.1, -3.96]} material={M.gold}><boxGeometry args={[8.2, 0.03, 0.03]} /></mesh>
      <Html position={[0, 0.05, 3.6]} center pointerEvents="none"><div className="zonetag">{tag}</div></Html>
    </group>
  );
}

// Payung meja outdoor
function Parasol({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} material={M.ink}><cylinderGeometry args={[0.025, 0.03, 2.4, 6]} /></mesh>
      <mesh position={[0, 2.26, 0]} material={M.cream}><cylinderGeometry args={[0.78, 0.78, 0.02, 10]} /></mesh>
      <mesh position={[0, 2.42, 0]} material={M.marun}><coneGeometry args={[0.78, 0.3, 10]} /></mesh>
      <mesh position={[0, 2.6, 0]} material={M.gold}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
    </group>
  );
}

// Zona di luar hak akses diredupkan dan dikunci
function ZoneLock({ cx, w, name, night }) {
  return (
    <group position={[cx, 1.6, 0]}>
      <mesh onClick={(e) => e.stopPropagation()}>
        <boxGeometry args={[w, 3.4, 8.2]} />
        <meshBasicMaterial color={night ? '#2A2224' : '#F8F1E7'} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <Html center position={[0, 0.3, 0]} pointerEvents="none"><div className="lockbadge">🔒 {name} — akses terbatas</div></Html>
    </group>
  );
}

export default function World({ night, low }) {
  const user = useStore((s) => s.user);
  const zones = ROLES[user.role].zones;
  const noProd = !zones.includes('produksi');
  const noOutlet = !zones.includes('outlet');
  return (
    <>
      <Site night={night} />
      <Zone cx={prodX} floor={M.cream2} tag="UNIT PRODUKSI" />
      <Building />
      <ProdBuilding night={night} />

      {/* Unit Produksi */}
      <Oven locked={noProd} />
      <DoughTable position={[-4.4 + PD, 0, -2.9]} />
      <CoolingRack position={[-2.0 + PD, 0, -2.9]} />

      {/* Outlet: konter + etalase + Bar Kopi + meja dalam */}
      <Counter />
      <Etalase locked={noOutlet} />
      <Bar />
      {INDOOR.map((t) => (<TableSet key={`${t.x}-${t.z}`} position={[t.x, 0, t.z]} />))}
      {/* Halaman Outlet: meja kursi outdoor berpayung */}
      {OUT_X.map((x) => (
        <group key={x}>
          <TableSet position={[x, 0, OUT_Z]} />
          <Parasol position={[x, 0, OUT_Z]} />
        </group>
      ))}

      {/* Rak stok (semua dari data) */}
      {Object.keys(LAYOUT).map((id) => (<Shelf key={id} id={id} />))}

      {/* Lampu gantung: menyala hangat saat malam (point light hanya di meja "lit") */}
      {INDOOR.map((t) => (<Lamp key={`l${t.x}-${t.z}`} position={[t.x, 2.4, t.z]} night={night} light={night && !low && t.lit} />))}
      {PROD_LAMPS.map((l) => (<Lamp key={`p${l.x}-${l.z}`} position={[l.x, 2.4, l.z]} night={night} light={night && !low && l.lit} />))}

      <Workers />
      <Delivery night={night} />
      <Customers />
      <OutletLights night={night} low={low} />
      <Walkways night={night} />
      <Gudang />
      <TableMess />
      <Traffic night={night} low={low} />
      <Restock />
      {noProd && <ZoneLock cx={prodX} w={8.2} name="Unit Produksi" night={night} />}
      {noOutlet && <ZoneLock cx={OUTLET.cx} w={OUTLET.x1 - OUTLET.x0 + 0.2} name="Outlet" night={night} />}
    </>
  );
}