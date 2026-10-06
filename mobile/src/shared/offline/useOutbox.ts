import { ApiError } from '@afridev/api-client';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useSyncExternalStore } from 'react';

import { enqueue, outbox, type OutboxEntry, type OutboxTable, startOutboxSync } from './outbox';

/** Écritures en attente de réseau (optionnellement filtrées par table). */
export function useOutbox(type?: OutboxTable): OutboxEntry[] {
  const all = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot, outbox.getSnapshot);
  return type ? all.filter((entry) => entry.type === type) : all;
}

/** Démarre la file et rafraîchit les données affichées après chaque envoi réussi. */
export function OutboxSync() {
  const queryClient = useQueryClient();
  useEffect(() => startOutboxSync(), []);
  useEffect(
    () =>
      outbox.onFlushed(({ sent }) => {
        if (sent) void queryClient.invalidateQueries();
      }),
    [queryClient],
  );
  return null;
}

/**
 * Envoie tout de suite si le réseau répond ; sinon met l'écriture en file d'attente.
 * `entry.id` doit être l'UUID utilisé pour l'appel en ligne : un double envoi est ignoré.
 */
export async function sendOrQueue<T>(
  send: () => Promise<T>,
  entry: Omit<OutboxEntry, 'createdAt'>,
): Promise<{ queued: false; result: T } | { queued: true; entry: OutboxEntry }> {
  const state = await NetInfo.fetch();
  if (state.isConnected !== false) {
    try {
      return { queued: false, result: await send() };
    } catch (error) {
      if (!(error instanceof ApiError && error.isNetwork)) throw error;
    }
  }
  return { queued: true, entry: enqueue(entry) };
}

/** UUID v4 généré sur le téléphone (identifiant stable des écritures hors ligne). */
export function uuid(): string {
  return Crypto.randomUUID();
}
