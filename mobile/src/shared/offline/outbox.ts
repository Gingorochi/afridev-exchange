import { ApiError } from '@afridev/api-client';
import NetInfo from '@react-native-community/netinfo';

import { API_URL, request, tokenStore } from '@/shared/api';
import { outboxStore, readJson, writeJson } from '@/shared/storage';

/**
 * File d'envoi hors ligne (module 5).
 * Une écriture faite sans réseau est gardée dans MMKV avec un UUID généré sur le téléphone,
 * puis rejouée via POST /api/sync/upload/ dès le retour du réseau. Le backend ignore un envoi
 * déjà reçu (même UUID) : rejouer la file après une coupure est sans danger.
 */

export type OutboxTable = 'posts' | 'comments' | 'questions' | 'answers' | 'snippets' | 'projects';

export interface OutboxEntry {
  id: string;
  op: 'PUT' | 'PATCH' | 'DELETE';
  type: OutboxTable;
  data: Record<string, unknown>;
  createdAt: string;
  label: string;
}

export interface FlushResult {
  sent: number;
  rejected: number;
}

const KEY = 'entries';
const RETRY_EVERY_MS = 30_000;

let entries: OutboxEntry[] = readJson<OutboxEntry[]>(outboxStore, KEY) ?? [];
let flushing: Promise<void> | null = null;
const listeners = new Set<() => void>();
const flushListeners = new Set<(result: FlushResult) => void>();

function save(next: OutboxEntry[]) {
  entries = next;
  writeJson(outboxStore, KEY, entries);
  listeners.forEach((listener) => listener());
}

export function enqueue(entry: Omit<OutboxEntry, 'createdAt'>): OutboxEntry {
  const full: OutboxEntry = { ...entry, createdAt: new Date().toISOString() };
  save([...entries, full]);
  void flushOutbox();
  return full;
}

export function removeFromOutbox(id: string) {
  save(entries.filter((entry) => entry.id !== id));
}

export function flushOutbox(): Promise<void> {
  flushing ??= (async () => {
    try {
      const state = await NetInfo.fetch();
      if (!entries.length || state.isConnected === false || !tokenStore.get()) return;
      const batch = entries;
      const response = await request(`${API_URL}/api/sync/upload/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: batch.map((entry, index) => ({
            op_id: index + 1,
            op: entry.op,
            type: entry.type,
            id: entry.id,
            data: entry.data,
          })),
        }),
      });
      if (!response.ok) return; // erreur serveur temporaire : nouvel essai plus tard
      const result = (await response.json()) as { applied: number; rejected: unknown[] };
      const sent = new Set(batch);
      save(entries.filter((entry) => !sent.has(entry)));
      flushListeners.forEach((listener) => listener({ sent: result.applied, rejected: result.rejected.length }));
    } catch (error) {
      if (!(error instanceof ApiError && error.isNetwork)) console.warn('Envoi différé échoué', error);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

export const outbox = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => entries,
  onFlushed(listener: (result: FlushResult) => void) {
    flushListeners.add(listener);
    return () => {
      flushListeners.delete(listener);
    };
  },
};

/** Relance l'envoi au retour du réseau, au démarrage et périodiquement. */
export function startOutboxSync(): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) void flushOutbox();
  });
  const timer = setInterval(() => void flushOutbox(), RETRY_EVERY_MS);
  return () => {
    unsubscribe();
    clearInterval(timer);
  };
}
