import { ApiError } from '@afridev/api-client';
import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { cacheStore } from '@/shared/storage';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
/** Changer cette valeur invalide les copies locales après un changement de format de l'API. */
const CACHE_VERSION = 'v1';

// Le cache sait si le téléphone est connecté : hors ligne, les requêtes attendent le réseau.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => cacheStore.getString(key) ?? null,
    setItem: (key, value) => cacheStore.set(key, value),
    removeItem: (key) => cacheStore.delete(key),
  },
  key: 'afridev.query-cache',
  throttleTime: 2_000,
});

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // L'appli lit d'abord sa copie locale, puis rafraîchit en arrière-plan.
        networkMode: 'offlineFirst',
        staleTime: 30_000,
        gcTime: ONE_WEEK,
        retry: (failures, error) =>
          failures < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { networkMode: 'always', retry: false },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeClient);

  // Rafraîchit les écrans quand l'appli revient au premier plan.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) =>
      focusManager.setFocused(status === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: ONE_WEEK,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success' && query.meta?.persist !== false,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
