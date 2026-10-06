import { useSyncExternalStore } from 'react';

import { useNetwork } from '@/shared/offline/useNetwork';
import { settingsStore } from '@/shared/storage';

export type TextOnlyMode = 'auto' | 'on' | 'off';
export type VideoQuality = 'auto' | '240' | '480' | '720';

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function usePreference<T extends string>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => (settingsStore.getString(key) as T | undefined) ?? fallback,
  );
  const set = (next: T) => {
    settingsStore.set(key, next);
    listeners.forEach((listener) => listener());
  };
  return [value, set] as const;
}

/**
 * Économie de données :
 * - « Texte seul » : médias remplacés par un aperçu flou à toucher (auto en 2G / 3G) ;
 * - qualité vidéo plafonnée, jamais de lecture automatique sur réseau lent ;
 * - option « rien de lourd en données mobiles ».
 */
export function useDataSaver() {
  const network = useNetwork();
  const [mode, setMode] = usePreference<TextOnlyMode>('data-saver.mode', 'auto');
  const [videoQuality, setVideoQuality] = usePreference<VideoQuality>('data-saver.video', 'auto');
  const [wifiOnly, setWifiOnlyRaw] = usePreference<'on' | 'off'>('data-saver.wifi-only', 'off');

  const heavyBlocked = wifiOnly === 'on' && network.isCellular;
  const textOnly = mode === 'on' || (mode === 'auto' && network.quality === 'slow') || heavyBlocked;
  const maxVideoHeight =
    videoQuality === 'auto' ? (network.quality === 'good' && !network.isCellular ? 720 : 240) : Number(videoQuality);

  return {
    network,
    mode,
    setMode,
    textOnly,
    videoQuality,
    setVideoQuality,
    maxVideoHeight,
    /** Lecture automatique autorisée seulement en Wi-Fi rapide. */
    autoplay: network.quality === 'good' && !network.isCellular && !textOnly,
    wifiOnly: wifiOnly === 'on',
    setWifiOnly: (value: boolean) => setWifiOnlyRaw(value ? 'on' : 'off'),
  };
}
