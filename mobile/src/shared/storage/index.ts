import { isExpoGo, isWeb } from '@/shared/runtime';

import { sqliteStore } from './sqliteStore';

/**
 * Petits stockages clé-valeur synchrones.
 * - development build et production : MMKV (~30x plus rapide qu'AsyncStorage) ;
 * - Expo Go, où MMKV n'existe pas : le magasin clé-valeur synchrone d'expo-sqlite ;
 * - cible web d'Expo : MMKV s'appuie sur localStorage.
 */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  getBoolean(key: string): boolean | undefined;
  set(key: string, value: string | boolean | number): void;
  delete(key: string): void;
  clearAll(): void;
  /** Taille approximative en octets. */
  readonly size: number;
  /** Compacte le fichier après un grand ménage. */
  trim(): void;
}

function mmkvStore(id: string): KeyValueStore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargement conditionnel (absent d'Expo Go)
  const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  return new MMKV({ id });
}

const createStore = (id: string): KeyValueStore => (isExpoGo && !isWeb ? sqliteStore(id) : mmkvStore(id));

export const settingsStore = createStore('settings');
export const cacheStore = createStore('query-cache');
export const outboxStore = createStore('outbox');
export const draftsStore = createStore('drafts');

export function readJson<T>(store: KeyValueStore, key: string): T | null {
  const raw = store.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown) {
  store.set(key, JSON.stringify(value));
}
