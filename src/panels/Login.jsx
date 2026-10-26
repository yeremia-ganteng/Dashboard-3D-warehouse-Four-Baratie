import { useState } from 'react';
import seed from '../data/data.json';
import { useStore } from '../store/useStore.js';
import { ROLES } from '../store/roles.js';
import Logo from './Logo.jsx';

export default function Login() {
  const login = useStore((s) => s.login);
  const [uid, setUid] = useState(seed.users[0].id);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => { e.preventDefault(); if (!login(uid, pin)) setErr('PIN salah. Coba lagi.'); };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-cream-2 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 bg-white p-6">
        <div className="flex flex-col items-center gap-2">
          <Logo size={88} />
          <h1 className="text-center font-display text-2xl font-semibold">
            Masuk ke <span className="font-script text-4xl font-normal text-gold">Baratie</span>
          </h1>
          <p className="text-center text-sm text-neutral-600">Dashboard stok 3D · Unit Produksi &amp; Outlet</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Pilih akun</legend>
          {seed.users.map((u) => (
            <label key={u.id} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm ${uid === u.id ? 'border-marun bg-cream' : 'border-gold/40'}`}>
              <input type="radio" name="akun" checked={uid === u.id} onChange={() => setUid(u.id)} className="accent-[#6B1F23]" />
              <span><b>{ROLES[u.role].label}</b> <span className="text-neutral-600">· {u.name}</span></span>
            </label>
          ))}
        </fieldset>

        <label className="block text-sm font-semibold">
          PIN
          <input className="input mt-1" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => { setPin(e.target.value); setErr(''); }} />
        </label>
        {err && <p role="alert" className="text-sm font-semibold text-marun">✕ {err}</p>}
        <button className="pill pill-primary w-full">Masuk</button>
        <p className="rounded-xl bg-cream p-3 text-xs text-neutral-700">
          <b>DATA DEMO.</b> PIN contoh: Owner 1111 · Staf Outlet 2222 · Staf Produksi 3333. Ganti dengan autentikasi sungguhan sebelum dipakai.
        </p>
      </form>
    </div>
  );
}