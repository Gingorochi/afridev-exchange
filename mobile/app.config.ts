import type { ExpoConfig } from 'expo/config';

const projectId = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'AfriDev Exchange',
  slug: 'afridev-exchange',
  scheme: 'afridev', // liens profonds : afridev://u/<username> (QR code)
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './src/assets/icon.png',
  ios: {
    bundleIdentifier: 'com.afridev.exchange',
    supportsTablet: false,
  },
  android: {
    package: 'com.afridev.exchange',
    edgeToEdgeEnabled: true,
    adaptiveIcon: { foregroundImage: './src/assets/adaptive-icon.png', backgroundColor: '#C84B20' },
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-secure-store',
    'expo-video',
    'expo-font',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        image: './src/assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#FDFBF7',
        dark: { image: './src/assets/splash-icon.png', backgroundColor: '#121110' },
      },
    ],
    [
      'expo-audio',
      { microphonePermission: 'AfriDev utilise le micro pour poser une question à la voix (transcrite en texte).' },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'AfriDev accède à vos photos et vidéos pour les joindre à vos publications.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  // Correctifs à chaud via EAS Update, sans attendre la validation des stores.
  runtimeVersion: { policy: 'appVersion' },
  ...(projectId ? { updates: { url: `https://u.expo.dev/${projectId}` } } : {}),
  extra: {
    eas: { projectId },
  },
};

export default config;
