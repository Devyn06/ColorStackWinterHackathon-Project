import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.groupridingapp',
  appName: 'frontend',
  webDir: 'www',
  android: {
    path: '../android' 
  }
};

export default config;
