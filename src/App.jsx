import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore.js';
import { initSync } from './pwa/sync.js';
import { detectQuality } from './scene/capability.js';
import LoadingScreen from './panels/LoadingScreen.jsx';
import ErrorBoundary from './panels/ErrorBoundary.jsx';
import Login from './panels/Login.jsx';
import Navbar from './panels/Navbar.jsx';
import QuickBar from './panels/QuickBar.jsx';
import Toast from './panels/Toast.jsx';
import DetailPanel from './panels/DetailPanel.jsx';
import Dashboard from './panels/Dashboard.jsx';
import Fallback2D from './panels/Fallback2D.jsx';
import PovPanel from './panels/PovPanel.jsx';
import TourPanel from './panels/TourPanel.jsx';

// Scene 3D dimuat lazy -> login & shell tampil cepat, three.js menyusul
const Scene = lazy(() => import('./scene/Scene.jsx'));
const detected = detectQuality();

function Shell() {
  const [quality, setQuality] = useState(() => localStorage.getItem('baratie-quality') || detected);
  const selected = useStore((s) => s.selected);
  const aside = useRef(null);
  const webgl = detected !== '2d';

  const toggle = () => {
    const next = quality === '2d' ? (webgl ? detected : '2d') : '2d';
    localStorage.setItem('baratie-quality', next);
    setQuality(next);
  };
  // Di mobile, detail tampil di atas panel -> gulir ke atas saat objek dipilih
  useEffect(() => { if (selected) aside.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [selected]);

  return (
    <div className="flex h-[100dvh] flex-col bg-cream">
      <Navbar quality={quality} webgl={webgl} onToggleQuality={toggle} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative h-[46dvh] shrink-0 lg:h-auto lg:flex-1">
          <div className="absolute inset-0">
            {quality === '2d' ? <Fallback2D /> : (
              <ErrorBoundary onError={() => setQuality('2d')}>
                <Suspense fallback={<LoadingScreen inline />}>
                  <Scene quality={quality} onFail={() => setQuality('2d')} />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
          <QuickBar quality={quality} />
          {quality !== '2d' && <PovPanel />}
          {quality !== '2d' && <TourPanel />}
          <DetailPanel variant="float" />
          <Toast />
        </main>
        <aside ref={aside} className="min-h-0 flex-1 overflow-y-auto border-t border-gold/30 bg-cream-2/60 lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
          <DetailPanel variant="inline" />
          <Dashboard />
        </aside>
      </div>
    </div>
  );
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const user = useStore((s) => s.user);
  useEffect(() => { useStore.getState().init().then(initSync); }, []);
  if (!ready) return <LoadingScreen />;
  if (!user) return <Login />;
  return <Shell />;
}