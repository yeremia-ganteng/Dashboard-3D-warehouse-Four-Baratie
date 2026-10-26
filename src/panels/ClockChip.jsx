import { useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import { useClock, setClockFollow } from '../scene/simClock.js';

const LEVEL = { ramai: 'Ramai', normal: 'Normal', sepi: 'Sepi', closed: 'Tutup' };

// Jam simulasi (DATA DEMO) + saklar "Ikut jam": siang/malam mengikuti jam simulasi
export default function ClockChip() {
  const c = useClock();
  const sim = useStore((s) => s.sim);

  // Saat "Ikut jam" aktif, mode malam disamakan dengan jam; tombol Siang/Malam manual tetap bisa dipakai di antaranya
  useEffect(() => {
    if (!c.follow) return;
    if (useStore.getState().night !== c.night) useStore.setState({ night: c.night });
  }, [c.follow, c.night]);

  return (
    <>
      <span
        className={`pill pill-ghost cursor-default ${sim ? '' : 'opacity-60'}`}
        title="Jam simulasi (DATA DEMO). Berhenti saat simulasi mati."
        aria-label={`Jam simulasi ${c.time}, ${LEVEL[c.level]} (data demo)`}
      >
        <span aria-hidden="true">🕒</span>{c.time}<span className="hidden md:inline"> · {LEVEL[c.level]}</span>
      </span>
      <button
        className={`pill ${c.follow ? 'pill-active' : 'pill-ghost'}`}
        aria-pressed={c.follow}
        onClick={() => setClockFollow(!c.follow)}
        aria-label="Siang dan malam ikut jam simulasi"
        title="Siang/malam ikut jam simulasi"
      >
        <span aria-hidden="true">⏱</span><span className="hidden md:inline">Ikut jam</span>
      </button>
    </>
  );
}