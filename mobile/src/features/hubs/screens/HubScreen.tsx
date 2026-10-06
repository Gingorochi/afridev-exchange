import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { PostCard, useFeed } from '@/features/feed';
import { useSession } from '@/shared/session';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  Button,
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  formatCount,
  HubIcon,
  Icon,
  Screen,
  ScreenHeader,
  Text,
} from '@/shared/ui';

import { type Hub, useHub } from '../api';
import { JoinButton } from '../components/JoinButton';

/** Page d'un hub : bannière, Rejoindre, règles, puis ses discussions. */
export function HubScreen() {
  const { colors } = useTheme();
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const hub = useHub(slug);
  const feed = useFeed({ hub: slug });

  return (
    <Screen header={<ScreenHeader title={`h/${slug}`} back />} scroll={false}>
      <FlashList
        data={hub.data ? feed.items : []}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => {
              void hub.refetch();
              void feed.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          hub.data ? (
            <HubHeader hub={hub.data} />
          ) : hub.isError ? (
            <ErrorNotice title="Hub introuvable" message="Il a peut-être été supprimé." />
          ) : (
            <CardSkeleton lines={3} />
          )
        }
        ListEmptyComponent={
          !hub.data ? null : feed.isPending ? (
            <CardSkeleton lines={3} />
          ) : (
            <EmptyState icon="feather" title="Aucune discussion pour l'instant" message="Lancez la première depuis le bouton « Publier »." />
          )
        }
      />
    </Screen>
  );
}

function HubHeader({ hub }: { hub: Hub }) {
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  return (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <View style={[styles.card, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient colors={[colors.primary, colors.tertiary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner} />
        <View style={styles.identity}>
          <View style={[styles.iconFrame, { backgroundColor: colors.card, borderColor: colors.card }]}>
            <HubIcon icon={hub.icon} name={hub.name} size={64} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="headlineLg" style={{ flexShrink: 1 }}>
              {hub.name}
            </Text>
            {hub.is_verified ? <Icon name="badge-check" size={20} tone="secondary" /> : null}
          </View>
          <Text variant="small" tone="muted">
            h/{hub.slug} · {formatCount(hub.member_count)} membre{hub.member_count > 1 ? 's' : ''}
            {hub.target_country ? ` · ${hub.target_country}` : ''}
          </Text>
          {hub.description ? <Text tone="muted">{hub.description}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <JoinButton hub={hub} size="md" />
            </View>
            {isAuthenticated ? (
              <View style={{ flex: 1 }}>
                <Button label="Publier" icon="edit-3" variant="ghost" onPress={() => router.push('/compose/post')} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {hub.rules.length ? (
        <View style={[styles.rules, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text variant="label">Règles du hub</Text>
          {hub.rules.map((rule, index) => (
            <View key={rule} style={{ flexDirection: 'row', gap: 10 }}>
              <Text variant="small" tone="faint">
                {index + 1}
              </Text>
              <Text variant="small" style={{ flex: 1 }}>
                {rule}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  banner: { height: 84, opacity: 0.9 },
  identity: { paddingHorizontal: space.md, paddingBottom: space.md, gap: 4 },
  iconFrame: { marginTop: -34, alignSelf: 'flex-start', borderRadius: 18, borderWidth: 4, marginBottom: 4 },
  rules: { borderRadius: radius.xl, borderWidth: 1, padding: space.md, gap: 8 },
});
