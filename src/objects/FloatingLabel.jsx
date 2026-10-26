import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { STATUS, fmtNum } from '../store/helpers.js';
import { LABEL_LOD, useLabelLevel } from '../scene/labelLod.js';

// Label DOM selalu menghadap kamera; non-interaktif (info lengkap ada di tabel panel).
// Detail menyesuaikan jarak kamera (scene/labelLod.js). hover = rak sedang ditunjuk -> selalu lengkap.
export default function FloatingLabel({ position, name, qty, unit, status, dense = false, hover = false }) {
  const st = STATUS[status];
  const level = useLabelLevel(dense);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [level, hover, invalidate]); // mode on-demand: posisikan ulang label setelah berganti tampilan

  const problem = status !== 'ok';
  const mode = hover || level === 'near' ? 'full' : level === 'mid' ? 'compact' : 'badge';
  if (mode === 'badge' && !problem && !LABEL_LOD.farShowOk) return null;

  const qtyText = status === 'empty' ? 'Habis' : fmtNum(qty);
  const cls = `flabel flabel-${status}${mode === 'full' ? '' : ` flabel-${mode}`}${problem && mode !== 'full' ? ' flabel-pulse' : ''}`;
  const z = hover ? [40, 30] : problem ? [20, 10] : [10, 0];

  return (
    <Html position={position} center pointerEvents="none" zIndexRange={z}>
      <div className={cls} aria-hidden="true">
        {mode === 'badge' && <b>{st.icon}</b>}
        {mode === 'compact' && <b>{st.icon} {qtyText}</b>}
        {mode === 'full' && (
          <>
            <b>{st.icon} {status === 'empty' ? 'Habis' : `${fmtNum(qty)} ${unit}`}</b>
            <span>{name}</span>
          </>
        )}
      </div>
    </Html>
  );
}