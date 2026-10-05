'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';

import { useLiveSocket } from '@/shared/realtime/useLiveSocket';
import { useSession } from '@/shared/session';
import { CountBadge, useToast } from '@/shared/ui';

import { notificationKeys, useUnreadCount } from '../api';

interface LiveNotification {
  event: 'notification';
  title: string;
}

/** Cloche de l'en-tête : compteur des non lues, mis à jour en direct (WebSocket). */
export function NotificationBell() {
  const { isAuthenticated } = useSession();
  const { data: unread = 0 } = useUnreadCount();
  const queryClient = useQueryClient();
  const toast = useToast();

  useLiveSocket<LiveNotification>(isAuthenticated ? '/ws/notifications/' : null, (message) => {
    if (message.event !== 'notification') return;
    toast(message.title, 'queued');
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  });

  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications : ${unread} non lues` : 'Notifications'}
      className="relative flex size-10 items-center justify-center rounded-full hover:bg-container"
    >
      <Bell className="size-5 text-ink-muted" aria-hidden />
      <CountBadge count={unread} className="absolute top-0.5 right-0.5 ring-2 ring-card" />
    </Link>
  );
}
