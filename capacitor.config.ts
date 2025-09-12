import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shuhnaexpress.app',
  appName: 'Shuhna Express',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    webContentsDebuggingEnabled: true
  }
};

export default config;
