import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore.js';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3800);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
      {show && toast && <div className="rounded-full bg-ink px-4 py-2 text-sm text-cream shadow-card">{toast.msg}</div>}
    </div>
  );
}