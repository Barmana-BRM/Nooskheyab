import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.pharmacyprescription',
  appName: 'نسخه‌یاب',
  webDir: 'dist',
  server: { cleartext: false },
  android: { allowMixedContent: false, captureInput: false, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'automatic' },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: '#062D2B' },
    StatusBar: { style: 'DARK', backgroundColor: '#062D2B' },
  },
};

export default config;
