import { useStore } from '../store/useStore.js';
import { ROLES, canSeeLoc } from '../store/roles.js';
import { startPov, stopPov, usePov } from '../scene/pov.js';
import { STATIONS } from '../scene/layout.js';
import Logo from './Logo.jsx';
import SyncBadge from './SyncBadge.jsx';
import ClockChip from './ClockChip.jsx';

export default function Navbar({ quality, webgl, onToggleQuality }) {
  const user = useStore((s) => s.user);
  const night = useStore((s) => s.night);
  const toggleNight = useStore((s) => s.toggleNight);
  const logout = useStore((s) => s.logout);
  const pov = usePov();
  const canPov = canSeeLoc(user, 'outlet');

  const povBtn = (key, active, label, onClick) => (
    <button key={key} className={`pill shrink-0 shadow-card ${active ? 'pill-active' : 'pill-ghost'}`} aria-pressed={active} onClick={onClick}>
      <span aria-hidden="true">👁</span>{label}
    </button>
  );

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-gold/30 bg-white/80 px-3 py-2">
      <Logo size={40} />
      <div className="min-w-0 leading-tight">
        <h1 className="truncate font-display text-lg font-semibold">Four É Baratie</h1>
        <p className="text-[11px] font-medium text-gold-deep">{ROLES[user.role].label} · {user.name}</p>
      </div>
      <span className="hidden rounded-full bg-marun px-2 py-1 text-[11px] font-semibold text-cream sm:inline">DATA DEMO</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ClockChip />
        <SyncBadge />
        <button className="pill pill-ghost" onClick={toggleNight} aria-pressed={night} aria-label={night ? 'Mode siang' : 'Mode malam'}>
          <span aria-hidden="true">{night ? '☀' : '☾'}</span> <span className="hidden md:inline">{night ? 'Siang' : 'Malam'}</span>
        </button>
        {canPov && (
          <>
            {STATIONS.map((s, i) => {
              const active = pov.on && pov.mode === 'cashier' && pov.station === i;
              return povBtn(s.id, active, `POV ${s.name}`, () => (active ? stopPov(true) : startPov('cashier', i)));
            })}
            {(() => {
              const active = pov.on && pov.mode === 'customer';
              return povBtn('cust', active, 'POV Pelanggan', () => (active ? stopPov(true) : startPov('customer')));
            })()}
          </>
        )}
        <button className="pill pill-ghost" onClick={logout}>Keluar</button>
      </div>
    </header>
  );
}