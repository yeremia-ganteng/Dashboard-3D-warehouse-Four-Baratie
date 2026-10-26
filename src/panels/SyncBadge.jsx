import { useStore } from '../store/useStore.js';

// Online / Offline (menunggu sinkron) / Tersinkron + jumlah data menunggu
export default function SyncBadge() {
  const { online, pending, lastSynced } = useStore((s) => ({ online: s.online, pending: s.pending, lastSynced: s.lastSynced }));
  let icon = '●', text = 'Online', cls = 'bg-[#E3F1E1] text-[#1E5B2A] border-[#8CC08C]';
  if (!online) { icon = '⊘'; text = `Offline · ${pending} menunggu sinkron`; cls = 'bg-[#FFF0D1] text-[#7A4A00] border-[#E09A2B]'; }
  else if (pending > 0) { icon = '↻'; text = `Online · menyinkronkan ${pending}`; }
  else if (lastSynced) { icon = '✓'; text = 'Tersinkron'; }
  return (
    <span role="status" className={`inline-flex min-h-[44px] items-center gap-1 rounded-full border px-3 text-xs font-semibold ${cls}`}>
      <span aria-hidden="true">{icon}</span>{text}
    </span>
  );
}