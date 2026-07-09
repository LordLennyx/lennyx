import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' pour que le build fonctionne en file:// (Electron) et dans la WebView Android (Capacitor)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
});
