import { registerSW } from 'virtual:pwa-register';
// Service worker dibuat vite-plugin-pwa (precache app shell + font)
export function initPWA() {
  if ('serviceWorker' in navigator) registerSW({ immediate: true });
}