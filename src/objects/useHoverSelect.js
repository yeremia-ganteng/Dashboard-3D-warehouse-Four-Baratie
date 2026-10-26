import { useState } from 'react';
import { useStore } from '../store/useStore.js';

// Hover -> highlight + kursor pointer; klik -> pilih objek & kamera terbang
export function useHoverSelect(sel, locked) {
  const [hover, setHover] = useState(false);
  const select = useStore((s) => s.select);
  const bind = locked ? {} : {
    onClick: (e) => { e.stopPropagation(); select(sel); },
    onPointerOver: (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { setHover(false); document.body.style.cursor = ''; },
  };
  return [hover, bind];
}