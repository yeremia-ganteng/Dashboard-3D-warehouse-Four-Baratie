import React from 'react';
import { createRoot } from 'react-dom/client';
// Font di-bundle (bukan CDN) supaya tetap tampil saat offline
import '@fontsource/playfair-display/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/great-vibes/400.css';
import './index.css';
import App from './App.jsx';
import { initPWA } from './pwa/register.js';

initPWA();
createRoot(document.getElementById('root')).render(<App />);