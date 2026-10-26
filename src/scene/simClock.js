import { useSyncExternalStore } from 'react';
import { CLOCK } from './layout.js';

// Jam simulasi (DATA DEMO). Dimajukan oleh Customers.jsx tiap frame selama simulasi menyala.
// Antarmuka React hanya diberi tahu saat tampilan jam berubah (per 1 menit saat buka, per 10 menit saat tutup).
const st = { min: CLOCK.start * 60, day: 1, follow: false };
const subs = new Set();
let lastKey = -1;

const isOpenAt = (m) => m >= CLOCK.open * 60 && m < CLOCK.close * 60;
const isNightAt = (m) => m >= CLOCK.nightFrom * 60 || m < CLOCK.nightTo * 60;
const profileAt = (m) => CLOCK.profile.find((p) => m >= p.from * 60 && m < p.to * 60);
const pad = (n) => String(n).padStart(2, '0');

function build() {
  const open = isOpenAt(st.min), p = open ? profileAt(st.min) : null, m = Math.floor(st.min);
  return {
    time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
    hour: Math.floor(m / 60),
    day: st.day,
    open,
    level: !open ? 'closed' : (p && p.level) || 'normal',
    night: isNightAt(st.min),
    follow: st.follow,
  };
}
let snap = build();
const emit = () => { snap = build(); subs.forEach((fn) => fn()); };

// Pengali laju kedatangan saat ini (0 = tutup)
export const clockRate = () => (isOpenAt(st.min) ? (profileAt(st.min)?.k ?? 1) : 0);
export const clockHour = () => Math.floor(st.min / 60);
export const clockDay = () => st.day;

export function tickClock(dt) {
  const open = isOpenAt(st.min);
  st.min += dt * (60 / CLOCK.secPerHour) * (open ? 1 : CLOCK.closedSpeed);
  if (st.min >= 1440) { st.min -= 1440; st.day += 1; }
  const step = isOpenAt(st.min) ? 1 : 10;
  const key = Math.floor(st.min / step) * 100 + step;
  if (key !== lastKey) { lastKey = key; emit(); }
}

export function setClockFollow(v) { st.follow = !!v; emit(); }

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const useClock = () => useSyncExternalStore(subscribe, () => snap);