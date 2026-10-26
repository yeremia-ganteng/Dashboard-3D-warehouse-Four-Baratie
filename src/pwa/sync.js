import { useStore, setFlushHook } from '../store/useStore.js';
import { queueAll, queueDelete, queueCount } from '../store/db.js';

let running = false;
let inited = false;

// >>> GANTI dengan panggilan backend sungguhan (Supabase/Firebase). Lempar error jika gagal
// agar operasi tetap di antrean dan dicoba lagi. Sekarang hanya simulasi.
async function pushToServer(op) {
  await new Promise((r) => setTimeout(r, 250));
  return true;
}

export async function flushQueue() {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    for (const op of await queueAll()) {
      await pushToServer(op);
      await queueDelete(op.id);
      useStore.setState({ pending: await queueCount() });
    }
    useStore.setState({ lastSynced: new Date().toISOString() });
  } catch (e) {
    console.warn('Sync gagal, akan dicoba lagi:', e);
  } finally {
    running = false;
    useStore.setState({ pending: await queueCount().catch(() => 0) });
  }
}

export function initSync() {
  if (inited) return;
  inited = true;
  const { setOnline } = useStore.getState();
  window.addEventListener('online', () => { setOnline(true); flushQueue(); });
  window.addEventListener('offline', () => setOnline(false));
  setFlushHook(() => setTimeout(flushQueue, 400));
  setOnline(navigator.onLine);
  flushQueue();
}