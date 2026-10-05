import type { KeyValueStore } from './index';

/** Magasin clé-valeur synchrone d'expo-sqlite (utilisé dans Expo Go, où MMKV n'existe pas). */
export function sqliteStore(id: string): KeyValueStore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargé seulement dans Expo Go, pas dans un vrai build
  const { SQLiteStorage } = require('expo-sqlite/kv-store') as typeof import('expo-sqlite/kv-store');
  const storage = new SQLiteStorage(`afridev-${id}.db`);
  return {
    getString: (key) => storage.getItemSync(key) ?? undefined,
    getBoolean: (key) => {
      const raw = storage.getItemSync(key);
      return raw === null ? undefined : raw === 'true';
    },
    set: (key, value) => storage.setItemSync(key, String(value)),
    delete: (key) => {
      storage.removeItemSync(key);
    },
    clearAll: () => {
      storage.clearSync();
    },
    get size() {
      return storage
        .getAllKeysSync()
        .reduce((total, key) => total + key.length + (storage.getItemSync(key)?.length ?? 0), 0);
    },
    trim: () => {},
  };
}
