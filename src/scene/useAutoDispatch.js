import { useEffect } from 'react';
import { useStore } from '../store/useStore.js';

// Memeriksa stok Outlet tiap 2,5 detik. Jika ada yang habis (dan bisa dipasok), truk berangkat otomatis.
// Hanya aktif di mode 3D dan saat simulasi menyala; logika pemicunya ada di store.autoDispatch.
export function useAutoDispatch(quality) {
  useEffect(() => {
    if (quality === '2d') return undefined;
    const id = setInterval(() => useStore.getState().autoDispatch(false), 2500);
    return () => clearInterval(id);
  }, [quality]);
}