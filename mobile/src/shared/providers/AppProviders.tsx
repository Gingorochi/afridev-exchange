import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePushNotifications } from '@/shared/notifications';
import { OutboxSync, PowerSyncProvider } from '@/shared/offline';
import { QueryProvider } from '@/shared/query';
import { SessionProvider } from '@/shared/session';
import { ThemeProvider } from '@/shared/theme';
import { ToastProvider } from '@/shared/ui';

function Background() {
  usePushNotifications();
  return <OutboxSync />;
}

/** Fournisseurs communs : thème, cache local, session, synchro, notifications. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider>
              <PowerSyncProvider>
                <ToastProvider>
                  <Background />
                  {children}
                </ToastProvider>
              </PowerSyncProvider>
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
