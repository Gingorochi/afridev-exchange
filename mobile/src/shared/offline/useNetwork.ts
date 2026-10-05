import { useNetInfo } from '@react-native-community/netinfo';

export type NetworkQuality = 'offline' | 'slow' | 'good';

export interface NetworkState {
  quality: NetworkQuality;
  isOnline: boolean;
  /** « 3G », « Wi-Fi »… pour les badges d'état. */
  label: string;
  /** Réseau mobile facturé à l'usage (ne rien télécharger de lourd). */
  isCellular: boolean;
}

/** Détection du réseau (NetInfo) : passe l'appli en mode « Texte seul » en 2G / 3G. */
export function useNetwork(): NetworkState {
  const net = useNetInfo();
  if (net.isConnected === false) {
    return { quality: 'offline', isOnline: false, label: 'Hors ligne', isCellular: false };
  }
  if (net.type === 'cellular') {
    const generation = net.details?.cellularGeneration ?? null;
    const slow = generation === '2g' || generation === '3g';
    return {
      quality: slow ? 'slow' : 'good',
      isOnline: true,
      label: generation ? generation.toUpperCase() : 'Mobile',
      isCellular: true,
    };
  }
  return { quality: 'good', isOnline: true, label: net.type === 'wifi' ? 'Wi-Fi' : 'En ligne', isCellular: false };
}
