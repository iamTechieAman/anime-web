import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toonplayer.app',
  appName: 'ToonPlayer',
  webDir: 'out',
  server: {
    url: 'https://anime-web-neon-one.vercel.app',
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
      backgroundColor: '#05050500' // Transparent
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#050505",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
