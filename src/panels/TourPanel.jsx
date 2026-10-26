import { useState } from 'react';
import { useTour, pauseTour, nextTour, prevTour, stopTour } from '../scene/tour.js';

// Panel penjelasan tur: judul, ringkasan, poin cara kerja, bar sisa waktu, dan tombol Jeda / Lanjut
export default function TourPanel() {
  const t = useTour();
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  if (!t.on) return null;

  const last = t.i === t.total - 1;
  return (
    <section
      className={`card tour-card absolute left-3 top-3 z-20 w-[min(24rem,calc(100%-1.5rem))] p-3 text-sm shadow-card${t.paused ? ' tour-paused' : ''}`}
      aria-label={`Tur otomatis: ${t.title}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-neutral-600">
          Tur {t.i + 1}/{t.total}{t.paused ? ' · Dijeda' : ''}
        </p>
        <span className="rounded-full bg-marun px-2 py-0.5 text-[10px] font-semibold text-cream">DATA DEMO</span>
      </div>
      <h2 className="font-display text-base font-semibold">{t.title}</h2>
      <div className="tour-bar" aria-hidden="true"><i key={t.key} style={{ '--d': `${t.dur}ms` }} /></div>

      <div className="tour-text">
        <p className="text-xs font-semibold" role="status" aria-live="polite">{t.lead}</p>
        {!small && t.points.length > 0 && (
          <ul>{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button className="pill pill-ghost" onClick={prevTour} disabled={t.i === 0}>‹ Sebelumnya</button>
        {t.paused ? (
          <button className="pill pill-primary" onClick={nextTour}>{last ? 'Selesai' : 'Lanjut ›'}</button>
        ) : (
          <button className="pill pill-primary" onClick={pauseTour}>⏸ Jeda</button>
        )}
        <button className="pill pill-ghost" aria-expanded={!small} onClick={() => setSmall(!small)}>{small ? 'Detail' : 'Ringkas'}</button>
        <button className="pill pill-ghost" onClick={stopTour}>Berhenti</button>
      </div>
      <p className="mt-2 text-[10px] text-neutral-600">DATA DEMO · penjelasan menggambarkan simulasi, bukan data bisnis nyata.</p>
    </section>
  );
}