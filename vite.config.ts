import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

// base './' pour que le build fonctionne en file:// (Electron) et dans la WebView Android (Capacitor)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
  define: {
    // La version du paquet, injectée à la compilation. Elle sert notamment à
    // nommer les caches du service worker : une seule source de vérité, donc
    // aucun risque d'oublier de la faire évoluer d'un côté seulement.
    __APP_VERSION__: JSON.stringify(version),
  },
});
