import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lennyx.app',
  appName: 'Lennyx',
  webDir: 'dist',
  backgroundColor: '#0b0e14',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Patché nativement : fetch/XHR passent par le natif, contournant le CORS
    // du WebView — nécessaire pour joindre l'API Gemini depuis l'app Android.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
