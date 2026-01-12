import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';
const config: CapacitorConfig = {
  appId: 'com.example.groupridingapp',
  appName: 'frontend',
  webDir: 'www',
  android: {
    path: '../android' 
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body, 
    },
    CapacitorHttp:{
      enabled:true,
    },
  },
};

export default config;
