import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useLiveSocket } from '@/shared/realtime/useLiveSocket';
import { useSession } from '@/shared/session';
import { Avatar, IconButton, useToast } from '@/shared/ui';

import { notificationKeys, useUnreadCount } from '../api';

/** Actions de l'en-tête des onglets : recherche, cloche (en direct), avatar. */
export function HeaderActions({ search = true }: { search?: boolean }) {
  const { isAuthenticated, profile } = useSession();
  const { data: unread = 0 } = useUnreadCount();
  const queryClient = useQueryClient();
  const toast = useToast();

  useLiveSocket<{ event: string; title: string }>(isAuthenticated ? '/ws/notifications/' : null, (message) => {
    if (message.event !== 'notification') return;
    toast(message.title, 'queued');
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {search ? <IconButton icon="search" label="Rechercher" onPress={() => router.push('/search')} /> : null}
      {isAuthenticated ? (
        <>
          <IconButton icon="bell" label={unread ? `Notifications : ${unread} non lues` : 'Notifications'} badge={unread} onPress={() => router.push('/notifications')} />
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Mon profil" hitSlop={6} style={{ marginLeft: 4 }}>
            <Avatar name={profile?.display_name || profile?.username || '?'} uri={profile?.avatar_url} size={38} />
          </Pressable>
        </>
      ) : (
        <IconButton icon="log-in" label="Se connecter" filled onPress={() => router.push('/login')} />
      )}
    </View>
  );
}
