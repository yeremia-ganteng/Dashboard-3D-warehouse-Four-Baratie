import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { ROLES, canSeeLoc } from '../store/roles.js';
import { statusOf } from '../store/helpers.js';
import { LAYOUT, STATIONS } from '../scene/layout.js';
import { useAutoDispatch } from '../scene/useAutoDispatch.js';
import { startTour, stopTour, useTour } from '../scene/tour.js';
import { reducedMotion } from '../scene/capability.js';

const BTNS = [
  { id: 'overview', label: 'Semua', zone: 'all' },
  { id: 'produksi', label: 'Unit Produksi', zone: 'produksi' },
  { id: 'outlet', label: 'Outlet', zone: 'outlet' },
  { id: 'top', label: 'Tampak Atas', zone: null },
];

const STAGE_TEXT = { load: 'Memuat peti…', go: 'Menuju Outlet…', unload: 'Membongkar…', back: 'Kembali ke produksi…' };
const ROOF_TEXT = { ghost: 'Transparan', solid: 'Solid', off: 'Sembunyi' };

export default function QuickBar({ quality }) {
  const user = useStore((s) => s.user);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const send = useStore((s) => s.sendToOutlet);
  const sim = useStore((s) => s.sim);
  const toggleSim = useStore((s) => s.toggleSim);
  const roof = useStore((s) => s.roof);
  const cycleRoof = useStore((s) => s.cycleRoof);
  const moving = useStore((s) => s.delivery.phase !== 'idle');
  const stage = useStore((s) => s.delivery.stage);
  const stocks = useStore((s) => s.stocks);
  const select = useStore((s) => s.select);
  const perms = ROLES[user.role];
  const list = BTNS.filter((b) => b.zone === null || (b.zone === 'all' ? perms.zones.length > 1 : perms.zones.includes(b.zone)));

  useAutoDispatch(quality);
  const tour = useTour();

  const turn = useRef(0);
  const problems = useMemo(() => {
    const rank = { empty: 0, low: 1 };
    return Object.keys(stocks)
      .filter((id) => LAYOUT[id] && canSeeLoc(user, id.split('@')[1]))
      .map((id) => [id, statusOf(stocks[id])])
      .filter(([, st]) => st === 'empty' || st === 'low')
      .sort((a, b) => rank[a[1]] - rank[b[1]])
      .map(([id]) => id);
  }, [stocks, user]);

  const focusProblem = () => {
    if (!problems.length) return;
    const id = problems[turn.current % problems.length];
    turn.current += 1;
    select({ type: 'stock', id });
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 px-4 pb-3 flex-wrap">
      {quality !== '2d' && !reducedMotion() && (
        <button
          className={`pill shadow-card ${tour.on ? 'pill-active' : 'pill-ghost'}`}
          aria-pressed={tour.on}
          onClick={tour.on ? stopTour : startTour}
          aria-label={tour.on ? `Hentikan tur kamera. Sedang di: ${tour.label}` : 'Mulai tur kamera otomatis'}
        >
          <span aria-hidden="true">{tour.on ? '■' : '▶'}</span>{tour.on ? 'Hentikan tur' : 'Tur otomatis'}
          {tour.on && tour.label && <span className="hidden md:inline"> · {tour.label}</span>}
        </button>
      )}
      {quality !== '2d' && problems.length > 0 && (
        <button
          className="pill pill-warn shadow-card"
          onClick={focusProblem}
          aria-label={`Fokus ke masalah stok: ${problems.length} item. Tekan lagi untuk item berikutnya.`}
        >
          <span aria-hidden="true">⚠</span>Fokus ke masalah ({problems.length})
        </button>
      )}
      {quality !== '2d' && (
        <button className="pill pill-ghost shadow-card" onClick={cycleRoof} aria-label={`Mode atap: ${ROOF_TEXT[roof]}. Tekan untuk mengganti.`}>
          <span aria-hidden="true">⌂</span>Atap: {ROOF_TEXT[roof]}
        </button>
      )}
      {quality !== '2d' && (
        <button className="pill pill-ghost shadow-card" aria-pressed={sim} onClick={toggleSim}>
          <span aria-hidden="true">{sim ? '●' : '○'}</span>Simulasi: {sim ? 'Aktif' : 'Mati'}
        </button>
      )}
      {perms.canSend && (
        <button className="pill pill-primary shadow-card" disabled={moving} onClick={() => send({ instant: quality === '2d' })}>
          <span aria-hidden="true">🚚</span>{moving ? STAGE_TEXT[stage] || 'Mengirim…' : 'Kirim Stok ke Outlet'}
        </button>
      )}
      {quality !== '2d' && (
        <>
          <span className="w-px h-6 shrink-0" style={{ background: 'rgba(176,122,58,.4)' }} aria-hidden="true" />
          {list.map((b) => (
            <button key={b.id} className={`pill shadow-card ${view === b.id ? 'pill-active' : 'pill-ghost'}`} aria-pressed={view === b.id} onClick={() => setView(b.id)}>
              {b.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}