import { useStore, itemMap } from '../store/useStore.js';
import { canSeeLoc } from '../store/roles.js';
import { statusOf } from '../store/helpers.js';
import { LAYOUT } from '../scene/layout.js';
import { M } from './materials.js';
import Stack from './Stack.jsx';
import FloatingLabel from './FloatingLabel.jsx';
import { useHoverSelect } from './useHoverSelect.js';

const STRIP = { ok: '#6B1F23', low: '#F2A93B', empty: '#8C8C8C' };
const PLANK = { ok: '#9B7248', low: '#D9A441', empty: '#BDB5AA' };

// Satu rak/bay stok. Tampilan: rack (lantai) | wall (dinding) | plate (alas di etalase)
export default function Shelf({ id }) {
  const L = LAYOUT[id];
  const stock = useStore((s) => s.stocks[id]);
  const locked = useStore((s) => !canSeeLoc(s.user, id.split('@')[1]));
  const [hover, bind] = useHoverSelect({ type: 'stock', id }, locked);
  if (!stock || !L) return null;

  const item = itemMap[stock.item];
  const status = statusOf(stock);
  const { width: w, plankY: py } = L;
  const isBread = item.kind === 'roti';
  const depth = L.frame === 'rack' ? 0.56 : L.frame === 'wall' ? 0.46 : 0.6; // area taruh barang
  const baseY = isBread ? py + 0.03 : py;                                      // roti duduk di atas baki
  const hv = hover ? '#B07A3A' : '#000000';
  const Box = ({ p, s, c }) => (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshLambertMaterial color={c} emissive={hv} emissiveIntensity={0.4} />
    </mesh>
  );

  return (
    <group position={L.pos} {...bind}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={M.shadow}>
        <planeGeometry args={[w + 0.15, 0.8]} />
      </mesh>

      {L.frame === 'rack' && (
        <>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => (
            <Box key={`${a}${b}`} p={[a * (w / 2 - 0.04), py / 2, b * 0.27]} s={[0.06, py, 0.06]} c="#3A3A3A" />
          ))}
          <Box p={[0, 0.2, 0]} s={[w, 0.05, 0.6]} c="#C9C4BC" />
          <Box p={[0, py - 0.035, 0]} s={[w, 0.07, 0.62]} c={PLANK[status]} />
        </>
      )}
      {L.frame === 'wall' && (
        <>
          <Box p={[0, py + 0.35, -0.24]} s={[w, 0.7, 0.04]} c="#E6DAC6" />
          <Box p={[0, py - 0.03, 0]} s={[w, 0.06, 0.5]} c={PLANK[status]} />
          <Box p={[-w / 2 + 0.06, py - 0.2, -0.1]} s={[0.04, 0.3, 0.3]} c="#3A3A3A" />
          <Box p={[w / 2 - 0.06, py - 0.2, -0.1]} s={[0.04, 0.3, 0.3]} c="#3A3A3A" />
        </>
      )}
      {L.frame === 'plate' && <Box p={[0, py - 0.012, 0]} s={[w, 0.03, 0.64]} c={PLANK[status]} />}

      {/* Baki panggang + alas kertas untuk roti */}
      {isBread && (
        <>
          <mesh position={[0, py + 0.012, 0]} material={M.steel}><boxGeometry args={[w - 0.06, 0.024, depth + 0.04]} /></mesh>
          <mesh position={[0, py + 0.026, 0]} material={M.cream}><boxGeometry args={[w - 0.14, 0.006, depth - 0.04]} /></mesh>
        </>
      )}

      {/* Strip status: marun (aman) / emas bersinar (rendah) / abu (habis) */}
      <mesh position={[0, py - (L.frame === 'plate' ? 0.04 : 0.09), 0.33]}>
        <boxGeometry args={[w, 0.05, 0.03]} />
        <meshLambertMaterial color={STRIP[status]} emissive={status === 'low' ? '#F2A93B' : '#000000'} emissiveIntensity={0.9} />
      </mesh>

      <Stack item={item} qty={stock.qty} cap={stock.cap} width={w} depth={depth} baseY={baseY} />

      {/* Area klik transparan (target sentuh lebih besar) */}
      <mesh position={[0, py + 0.25, 0]}>
        <boxGeometry args={[w, 0.6, 0.64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {!locked && <FloatingLabel position={[0, L.labelY, 0]} name={item.name} qty={stock.qty} unit={item.unit} status={status} dense={w < 1.4} hover={hover} />}
    </group>
  );
}