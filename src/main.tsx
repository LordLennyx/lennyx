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
    // La version voyage dans l'URL : le navigateur voit un worker différent à
    // chaque publication et le réinstalle, au lieu de garder l'ancien.
    void navigator.serviceWorker
      .register(`./sw.js?v=${__APP_VERSION__}`)
      .then((reg) => {
        // Safari ne cherche une nouvelle version qu'au lancement. Une
        // vérification horaire évite qu'une application installée depuis des
        // semaines reste bloquée sur du vieux code.
        setInterval(() => void reg.update(), 60 * 60_000);

        // Une version est prête mais attend que l'ancienne libère la place :
        // on prévient l'application, qui proposera de recharger.
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('lennyx-update-ready'));
            }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('lennyx-update-ready'));
        }
        reg.addEventListener('updatefound', () => watch(reg.installing));
      })
      .catch(() => {
        /* le SW est un bonus */
      });
  });
}
