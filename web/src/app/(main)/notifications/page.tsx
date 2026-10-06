import type { Metadata } from 'next';

import { NotificationsScreen } from '@/features/notifications';
import { RequireAuth } from '@/shared/session';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsScreen />
    </RequireAuth>
  );
}
