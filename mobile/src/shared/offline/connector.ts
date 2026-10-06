import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/common';

import { API_URL, POWERSYNC_URL, request } from '@/shared/api';

/** Pont entre la copie SQLite et Django : jeton PowerSync et envoi des écritures locales. */
export class BackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const response = await request(`${API_URL}/api/sync/token/`).catch(() => null);
    if (!response?.ok) return null;
    const { token } = (await response.json()) as { token: string };
    return { endpoint: POWERSYNC_URL, token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;
    const response = await request(`${API_URL}/api/sync/upload/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations: transaction.crud.map((op) => op.toJSON()) }),
    });
    // En cas d'échec, la transaction reste en file : PowerSync réessaiera.
    if (!response.ok) throw new Error(`upload -> ${response.status}`);
    await transaction.complete();
  }
}
