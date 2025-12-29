import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.catchi.app',
  appName: 'Catchi',
  webDir: 'dist',
  ...(process.env.CAPACITOR_SERVER_URL
    ? {
        server: {
          // For development only (live reload). Set CAPACITOR_SERVER_URL to enable.
          url: process.env.CAPACITOR_SERVER_URL,
          cleartext: true,
        },
      }
    : {}),
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a', // Navy dark background
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
