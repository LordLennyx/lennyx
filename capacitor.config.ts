import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lennyx.app',
  appName: 'Lennyx',
  webDir: 'dist',
  backgroundColor: '#0b0e14',
  android: {
    allowMixedContent: false,
  },
};

export default config;
