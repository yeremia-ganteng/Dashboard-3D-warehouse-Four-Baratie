import Logo from './Logo.jsx';

export default function LoadingScreen({ inline }) {
  return (
    <div className={`${inline ? 'absolute inset-0' : 'fixed inset-0'} z-30 grid place-items-center bg-cream`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <Logo size={96} />
        <p className="font-display text-lg">Memuat dashboard…</p>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-cream-2">
          <div className="h-full w-1/2 rounded-full bg-marun animate-[load_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}