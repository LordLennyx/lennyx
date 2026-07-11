import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WidgetView from './components/WidgetView';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './styles/global.css';

// Fenêtre widget flottante (Windows) : même bundle, vue compacte en lecture seule.
const isWidget = new URLSearchParams(window.location.search).get('widget') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isWidget ? <WidgetView /> : <App />}
  </React.StrictMode>,
);

// PWA : uniquement en contexte sécurisé (https / localhost) — pas en
// Electron (file://) ni dans la WebView Capacitor (le natif s'en charge).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* le SW est un bonus */
    });
  });
}
