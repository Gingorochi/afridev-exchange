import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Adresse de l'API en développement, sans rien configurer :
 * - téléphone réel (Expo Go ou development build) : la machine qui sert le bundle Metro
 *   (« 192.168.x.x:8081 » → « http://192.168.x.x:8000 ») ;
 * - émulateur Android : 10.0.2.2 = la machine hôte ; web et iOS simulateur : localhost.
 * EXPO_PUBLIC_API_URL l'emporte toujours (production, tunnel, autre port).
 */
function devApiUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || devApiUrl();
export const WS_URL = API_URL.replace(/^http/, 'ws');
/** Vide : pas de copie SQLite PowerSync (lecture via l'API et son cache local). */
export const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL ?? '';
export const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
/** URL web publique (liens partagés, QR code). */
export const PUBLIC_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
