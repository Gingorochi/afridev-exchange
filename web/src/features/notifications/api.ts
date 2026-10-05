'use client';

import type { Schemas } from '@afridev/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from '@/shared/api';
import { useInfiniteList } from '@/shared/query';
import { useSession } from '@/shared/session';

export type Notification = Schemas['Notification'];

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  list: (unreadOnly: boolean) => ['notifications', 'list', unreadOnly] as const,
};

export function useUnreadCount() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => unwrap(api.GET('/api/notifications/unread-count/')),
    enabled: isAuthenticated,
    refetchInterval: 120_000,
    select: (data) => data.unread,
  });
}

export function useNotifications(unreadOnly: boolean) {
  return useInfiniteList(notificationKeys.list(unreadOnly), (cursor) =>
    unwrap(
      api.GET('/api/notifications/', {
        params: { query: { cursor, unread: unreadOnly || undefined } },
      }),
    ),
  );
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST('/api/notifications/{notification_id}/read/', { params: { path: { notification_id: id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/notifications/read-all/')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

/** Lien de l'écran concerné, d'après data = {type, id}. */
export function notificationHref(notification: Notification): string | null {
  const data = (notification.data ?? {}) as { type?: string; id?: string };
  if (!data.id) return null;
  switch (data.type) {
    case 'post':
      return `/feed/${data.id}`;
    case 'question':
      return `/questions/${data.id}`;
    case 'snippet':
      return `/snippets/${data.id}`;
    case 'project':
      return `/projects/${data.id}`;
    case 'guide':
      return `/projects/guides/${data.id}`;
    case 'comment':
    case 'answer':
      return null;
    default:
      return null;
  }
}
