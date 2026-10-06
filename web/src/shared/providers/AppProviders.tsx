'use client';

import { DataSaverSync } from '@/shared/data-saver';
import { OutboxSync, PowerSyncProvider } from '@/shared/offline';
import { QueryProvider } from '@/shared/query';
import { SessionProvider } from '@/shared/session';
import { ThemeSync } from '@/shared/theme';
import { ToastProvider } from '@/shared/ui';

/** Fournisseurs communs à toutes les pages (cache local, session, hors ligne, préférences). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <PowerSyncProvider>
          <ToastProvider>
            <ThemeSync />
            <DataSaverSync />
            <OutboxSync />
            {children}
          </ToastProvider>
        </PowerSyncProvider>
      </SessionProvider>
    </QueryProvider>
  );
}
