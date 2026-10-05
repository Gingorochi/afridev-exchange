import type { KeyValueStore } from './index';

/** Cible web : MMKV (sur localStorage) est utilisé ; expo-sqlite (WebAssembly) n'est pas embarqué. */
export function sqliteStore(): KeyValueStore {
  throw new Error('sqliteStore est réservé à Expo Go (iOS / Android).');
}