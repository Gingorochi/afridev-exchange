import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useDebounced } from '@/shared/hooks';
import { useSession } from '@/shared/session';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  formatCount,
  HubIcon,
  Icon,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  TextField,
} from '@/shared/ui';

import { type Hub, useHubs } from '../api';
import { JoinButton } from '../components/JoinButton';

type View_ = 'popular' | 'new' | 'mine';

/** Explorer les hubs : populaires, récents, ou ceux que j'ai rejoints. */
export function HubsScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const [view, setView] = useState<View_>('popular');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 300) || undefined;
  const hubs = useHubs(view === 'mine' ? { mine: true, q } : { sort: view, q }, view !== 'mine' || isAuthenticated);

  return (
    <Screen header={<ScreenHeader title="Hubs" subtitle="Les communautés tech africaines" back />} scroll={false}>
      <FlashList
        data={hubs.items}
        keyExtractor={(hub) => hub.id}
        renderItem={({ item }) => <HubRow hub={item} />}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        contentContainerStyle={{ padding: space.md, paddingBottom: 80 }}
        onEndReached={() => hubs.hasNextPage && !hubs.isFetchingNextPage && void hubs.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={hubs.isRefetching} onRefresh={() => void hubs.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <TextField value={query} onChangeText={setQuery} placeholder="Rechercher un hub" icon="search" accessibilityLabel="Rechercher un hub" />
            <Segmented<View_>
              value={view}
              onChange={setView}
              options={[
                { value: 'popular', label: 'Populaires' },
                { value: 'new', label: 'Récents' },
                ...(isAuthenticated ? [{ value: 'mine' as const, label: 'Mes hubs' }] : []),
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          hubs.isPending ? (
            <CardSkeleton lines={2} />
          ) : hubs.isError ? (
            <ErrorNotice message="Les hubs s'afficheront dès le retour du réseau." />
          ) : (
            <EmptyState icon="users" title={view === 'mine' ? "Vous n'avez rejoint aucun hub" : 'Aucun hub trouvé'} message="Essayez un autre mot-clé." />
          )
        }
      />
    </Screen>
  );
}

function HubRow({ hub }: { hub: Hub }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(`/h/${hub.slug}`)}
      accessibilityRole="link"
      style={({ pressed }) => [styles.row, cardShadow, { backgroundColor: colors.card, borderColor: pressed ? colors.borderStrong : colors.border }]}
    >
      <HubIcon icon={hub.icon} name={hub.name} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {hub.name}
          </Text>
          {hub.is_verified ? <Icon name="badge-check" size={15} tone="secondary" /> : null}
        </View>
        <Text variant="small" tone="faint" numberOfLines={1}>
          h/{hub.slug} · {formatCount(hub.member_count)} membre{hub.member_count > 1 ? 's' : ''}
        </Text>
        {hub.description ? (
          <Text variant="small" tone="muted" numberOfLines={2}>
            {hub.description}
          </Text>
        ) : null}
      </View>
      <JoinButton hub={hub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.xl, borderWidth: 1 },
});
