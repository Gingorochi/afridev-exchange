import type { AbstractPowerSyncDatabase } from '@powersync/common';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { POWERSYNC_URL } from '@/shared/api';
import { isExpoGo } from '@/shared/runtime';
import { useSession } from '@/shared/session';

/**
 * Copie SQLite locale synchronisée par PowerSync (coffre de snippets).
 * Activée seulement si EXPO_PUBLIC_POWERSYNC_URL est défini (et sur iOS / Android) ;
 * sinon les écrans lisent l'API et son cache local MMKV.
 */
interface LocalDb {
  db: AbstractPowerSyncDatabase | null;
  ready: boolean;
}

const LocalDbContext = createContext<LocalDb>({ db: null, ready: false });

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSession();
  const [state, setState] = useState<LocalDb>({ db: null, ready: false });

  useEffect(() => {
    // Expo Go n'embarque pas le SQLite natif de PowerSync : lecture via l'API et son cache.
    if (!POWERSYNC_URL || !isAuthenticated || Platform.OS === 'web' || isExpoGo) return;
    let database: AbstractPowerSyncDatabase | null = null;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      // Modules natifs chargés à la demande.
      const [{ PowerSyncDatabase }, { AppSchema }, { BackendConnector }] = await Promise.all([
        import('@powersync/react-native'),
        import('@afridev/sync-schema'),
        import('./connector'),
      ]);
      if (cancelled) return;
      database = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: 'afridev.sqlite' } });
      await database.init();
      const update = () => setState({ db: database, ready: Boolean(database?.currentStatus.hasSynced) });
      dispose = database.registerListener({ statusChanged: update });
      update();
      void database.connect(new BackendConnector());
    })();
    return () => {
      cancelled = true;
      dispose?.();
      void database?.disconnectAndClear();
      setState({ db: null, ready: false });
    };
  }, [isAuthenticated]);

  return <LocalDbContext.Provider value={state}>{children}</LocalDbContext.Provider>;
}

/** Requête SQL sur la copie locale, mise à jour à chaque changement (null si indisponible). */
export function useLocalQuery<T>(sql: string, params: unknown[] = []): T[] | null {
  const { db, ready } = useContext(LocalDbContext);
  const [rows, setRows] = useState<T[] | null>(null);
  const key = JSON.stringify(params);

  useEffect(() => {
    if (!db || !ready) return;
    const controller = new AbortController();
    void (async () => {
      for await (const result of db.watch(sql, JSON.parse(key) as unknown[], { signal: controller.signal })) {
        setRows((result.rows?._array ?? []) as T[]);
      }
    })();
    return () => controller.abort();
  }, [db, ready, sql, key]);

  return db && ready ? rows : null;
}
