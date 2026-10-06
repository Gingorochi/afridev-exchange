import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RequireAuth } from '@/shared/layout';
import { notificationRoute } from '@/shared/notifications';
import { radius, space, useTheme } from '@/shared/theme';
import {
  Button,
  CardSkeleton,
  EmptyState,
  FilterChips,
  Icon,
  IconButton,
  type IconName,
  Screen,
  ScreenHeader,
  Text,
  timeAgo,
} from '@/shared/ui';

import { type Notification, useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '../api';

const KINDS: Record<string, { icon: IconName; label: string; tone: 'primary' | 'secondary' | 'danger' | 'tertiary' }> = {
  new_comment: { icon: 'message-square', label: 'Nouveau commentaire', tone: 'primary' },
  comment_reply: { icon: 'corner-down-right', label: 'Réponse à votre commentaire', tone: 'primary' },
  post_liked: { icon: 'heart', label: 'Mention j’aime', tone: 'primary' },
  new_answer: { icon: 'message-circle', label: 'Nouvelle réponse communautaire', tone: 'primary' },
  answer_accepted: { icon: 'check-circle', label: 'Réponse acceptée', tone: 'secondary' },
  ai_answer_ready: { icon: 'zap', label: 'Réponse IA prête', tone: 'tertiary' },
  snippet_flagged: { icon: 'shield-off', label: 'Security Guard · secret isolé', tone: 'danger' },
  content_hidden: { icon: 'eye-off', label: 'Modération', tone: 'danger' },
  guide_ready: { icon: 'book-open', label: 'Guide de démarrage', tone: 'secondary' },
  application_received: { icon: 'user-plus', label: 'Candidature open source', tone: 'secondary' },
  application_answered: { icon: 'users', label: 'Réponse à votre candidature', tone: 'secondary' },
};

export function NotificationsScreen() {
  return (
    <RequireAuth title="Notifications">
      <NotificationsList />
    </RequireAuth>
  );
}

function NotificationsList() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const { data: unread = 0 } = useUnreadCount();
  const list = useNotifications(tab === 'unread');
  const markAll = useMarkAllRead();

  const today = list.items.filter((n) => Date.now() - new Date(n.created_at).getTime() < 86_400_000);
  const older = list.items.filter((n) => !today.includes(n));

  return (
    <Screen
      header={
        <ScreenHeader
          title="Notifications"
          back
          right={<IconButton icon="check-square" label="Tout marquer comme lu" tone="primary" onPress={() => markAll.mutate()} />}
        />
      }
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <FilterChips
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'Toutes' },
          { value: 'unread', label: 'Non lues', count: unread },
        ]}
      />
      {list.isPending ? (
        <CardSkeleton lines={2} />
      ) : !list.items.length ? (
        <EmptyState icon="bell-off" title={tab === 'unread' ? 'Tout est lu' : 'Aucune notification'} message="Réponses, candidatures et alertes de sécurité apparaîtront ici." />
      ) : (
        <>
          {today.length ? <Group title="Aujourd'hui" items={today} /> : null}
          {older.length ? <Group title="Plus tôt" items={older} /> : null}
          {list.hasNextPage ? <Button label="Charger plus" variant="ghost" onPress={() => list.fetchNextPage()} loading={list.isFetchingNextPage} /> : null}
        </>
      )}
    </Screen>
  );
}

function Group({ title, items }: { title: string; items: Notification[] }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="headlineMd">{title}</Text>
      {items.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </View>
  );
}

/** Glisser n'est pas nécessaire : un toucher ouvre l'écran concerné et marque comme lu. */
function NotificationRow({ notification }: { notification: Notification }) {
  const { colors } = useTheme();
  const markRead = useMarkRead();
  const unread = !notification.read_at;
  const kind = KINDS[notification.kind] ?? KINDS.new_comment!;
  const route = notificationRoute(notification.data as Record<string, unknown>);
  const toneColor = { primary: colors.primaryInk, secondary: colors.secondaryInk, danger: colors.danger, tertiary: colors.onTertiarySoft }[kind.tone];
  const toneBg = { primary: colors.primarySoft, secondary: colors.secondaryMint, danger: colors.dangerSoft, tertiary: colors.tertiarySoft }[kind.tone];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (unread) markRead.mutate(notification.id);
        if (route) router.push(route as never);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: kind.tone === 'danger' ? colors.dangerSoft : pressed ? colors.container : colors.card,
          borderColor: colors.border,
          borderLeftColor: unread ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: toneBg }]}>
        <Icon name={kind.icon} size={22} color={toneColor} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.meta}>
          <Text variant="label" style={{ color: toneColor, flex: 1 }} numberOfLines={1}>
            {kind.label}
          </Text>
          <Text variant="monoSm" tone="faint">
            {timeAgo(notification.created_at)}
          </Text>
        </View>
        <Text variant={unread ? 'bodyMedium' : 'body'}>{notification.title}</Text>
        {notification.body ? (
          <Text variant="small" tone="muted" numberOfLines={3}>
            {notification.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderLeftWidth: 4 },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
