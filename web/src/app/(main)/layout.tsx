import { CommunityNav } from '@/features/feed';
import { NotificationBell } from '@/features/notifications';
import { AppShell } from '@/shared/layout';

/** Pages de l'application : cadre commun (navigation, communautés, recherche, connectivité). */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell notifications={<NotificationBell />} communities={<CommunityNav />}>
      {children}
    </AppShell>
  );
}