import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderActions } from '@/features/notifications';
import { removeFromOutbox, useOutbox } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { cardShadow, fonts, radius, space, useTheme } from '@/shared/theme';
import {
  AppBar,
  Avatar,
  Button,
  CardSkeleton,
  CommunityIcon,
  EmptyState,
  ErrorNotice,
  FilterChips,
  HubIcon,
  Icon,
  type IconName,
  LogoMark,
  OfflineBanner,
  Pill,
  Text,
} from '@/shared/ui';

import { type PostKind, useCommunities, useFeed, usePopularHubs } from '../api';
import { PostCard } from '../components/PostCard';

type KindFilter = 'all' | PostKind;

/** Marge et espacement des cartes : 12 px, comme le fil web sur téléphone. */
const GAP = 12;

export function FeedScreen() {
  const { colors } = useTheme();
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [kind, setKind] = useState<KindFilter>('all');
  const feed = useFeed({ tag: tag || undefined, kind: kind === 'all' ? undefined : kind });

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar right={<HeaderActions />} />
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <OfflineBanner />
        <FlashList
          data={feed.items}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => <PostCard post={item} />}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={{ padding: GAP, paddingBottom: 120 }}
          onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            <FeedHeader kind={kind} onKind={(value) => (value === 'short' ? router.push('/shorts') : setKind(value))} tag={tag || undefined} />
          }
          ListEmptyComponent={
            <View style={{ gap: GAP }}>
              {feed.isPending ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton lines={4} />
                </>
              ) : feed.isError ? (
                <ErrorNotice message="Le fil n'est pas encore disponible sur ce téléphone. Il s'affichera dès le retour du réseau." />
              ) : (
                <EmptyState
                  icon="feather"
                  title={tag ? `Rien encore dans d/${tag}` : 'Rien à afficher pour l’instant'}
                  message="Soyez le premier à partager une astuce avec la communauté."
                />
              )}
            </View>
          }
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View style={{ paddingTop: GAP }}>
                <CardSkeleton lines={2} />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function FeedHeader({ kind, onKind, tag }: { kind: KindFilter; onKind: (kind: KindFilter) => void; tag?: string }) {
  const { isAuthenticated } = useSession();
  const pending = useOutbox('posts');
  return (
    <View style={{ gap: GAP, marginBottom: GAP }}>
      {tag ? <CommunityBanner tag={tag} /> : null}
      {isAuthenticated ? <ComposerBar community={tag} /> : <JoinCard />}
      {tag ? null : <CommunityStrip />}
      {/* Puces posées sur le fond, comme sur le web ; elles défilent jusqu'au bord. */}
      <View style={{ marginHorizontal: -GAP }}>
        <FilterChips<KindFilter>
          inset={GAP}
          value={kind}
          onChange={onKind}
          options={[
            { value: 'all', label: 'Tout', icon: 'zap' },
            { value: 'text', label: 'Publications', icon: 'file-text' },
            { value: 'poll', label: 'Sondages', icon: 'bar-chart-2' },
            { value: 'short', label: 'Vidéos', icon: 'film' },
            { value: 'image', label: 'Images', icon: 'image' },
          ]}
        />
      </View>
      {pending.map((entry) => (
        <PendingPost key={entry.id} id={entry.id} body={String(entry.data.body ?? '')} />
      ))}
    </View>
  );
}

const TOOLS: { label: string; icon: IconName; color: string; href: string }[] = [
  { label: 'Image', icon: 'image', color: '#1B5E3A', href: '/compose/post' },
  { label: 'Vidéo', icon: 'film', color: '#C84B20', href: '/compose/short' },
  { label: 'Sondage', icon: 'bar-chart-2', color: '#B45309', href: '/compose/post' },
  { label: 'Code', icon: 'code', color: '', href: '/compose/post' },
];

/** « Quoi de neuf ? » façon LinkedIn : ouvre l'écran de publication. */
function ComposerBar({ community }: { community?: string }) {
  const { colors } = useTheme();
  const { profile } = useSession();
  const name = profile?.display_name || profile?.username || '?';
  const firstName = name.split(' ')[0];
  return (
    <View style={[styles.block, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.composerRow}>
        <Avatar name={name} uri={profile?.avatar_url} size={46} />
        <Pressable
          onPress={() => router.push('/compose/post')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.composerInput, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.container : colors.card }]}
        >
          <Text tone="muted" numberOfLines={1}>
            {community ? `Publier dans d/${community}` : `Quoi de neuf, ${firstName} ?`}
          </Text>
        </Pressable>
      </View>
      <View style={styles.tools}>
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.label}
            onPress={() => router.push(tool.href as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.tool, pressed && { backgroundColor: colors.container }]}
          >
            <Icon name={tool.icon} size={19} color={tool.color || colors.ink} />
            <Text variant="small" tone="muted" style={{ fontFamily: fonts.medium }}>
              {tool.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Hubs populaires en bande horizontale (un toucher : la page du hub ; « Tous » : l'exploration). */
function CommunityStrip() {
  const { colors } = useTheme();
  const hubs = usePopularHubs();
  if (!hubs.data?.results.length) return null;
  return (
    <View style={[styles.block, cardShadow, { backgroundColor: colors.card, borderColor: colors.border, paddingHorizontal: 0, gap: 10 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.md }}>
        <Text variant="label">Hubs populaires</Text>
        <Pressable onPress={() => router.push('/hubs')} hitSlop={8} accessibilityRole="link">
          <Text variant="label" tone="primary">
            Tous les hubs
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.md }}>
        {hubs.data.results.map((hub) => (
          <Pressable
            key={hub.id}
            onPress={() => router.push(`/h/${hub.slug}`)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.communityChip, { backgroundColor: pressed ? colors.containerHigh : colors.container }]}
          >
            <HubIcon icon={hub.icon} name={hub.name} size={24} />
            <Text variant="label">h/{hub.slug}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Bandeau d'une communauté (fil filtré par tag), façon subreddit. */
function CommunityBanner({ tag }: { tag: string }) {
  const { colors } = useTheme();
  const communities = useCommunities(50);
  const stats = communities.data?.find((community) => community.tag === tag);
  const total = stats ? stats.posts + stats.questions : null;
  return (
    <View style={[styles.cardFrame, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Dégradé du web : primary → tertiary → secondary, à 120°. */}
      <LinearGradient
        colors={[colors.primary, colors.tertiary, colors.secondary]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={styles.banner}
      />
      <View style={styles.bannerBody}>
        <View style={[styles.bannerIcon, { borderColor: colors.card }]}>
          <CommunityIcon tag={tag} size={60} />
        </View>
        <View style={{ flex: 1, paddingTop: 8 }}>
          <Text variant="headlineLg">d/{tag}</Text>
          <Text variant="monoSm" tone="muted">
            {total === null ? 'Communauté AfriDev' : `${total} publication${total > 1 ? 's' : ''} ces 90 derniers jours`}
          </Text>
        </View>
        <Pressable onPress={() => router.setParams({ tag: '' })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retour au fil complet" style={{ paddingTop: 10 }}>
          <Icon name="x" size={22} tone="muted" />
        </Pressable>
      </View>
    </View>
  );
}

/** Post écrit hors ligne : visible tout de suite, annulable tant qu'il n'est pas parti. */
function PendingPost({ id, body }: { id: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.block, { borderColor: colors.tertiary, backgroundColor: colors.card, borderStyle: 'dashed' }]}>
      <Pill tone="warning" icon="clock" label="Envoi au retour du réseau" />
      <Text numberOfLines={4}>{body}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label="Annuler l’envoi" icon="x-circle" variant="ghost" size="sm" onPress={() => removeFromOutbox(id)} />
      </View>
    </View>
  );
}

/** Carte d'accueil des visiteurs (WelcomeCard du web). */
function JoinCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardFrame, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LinearGradient colors={[colors.primarySoft, colors.secondarySoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={styles.welcome}>
        <LogoMark size={48} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="headlineMd">Le réseau d’entraide des développeurs africains</Text>
          <Text tone="muted">
            Questions avec réponse IA instantanée, snippets disponibles hors ligne, projets open source qui recrutent. Pensé pour la 3G.
          </Text>
        </View>
      </LinearGradient>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.md }}>
        <Button label="Rejoindre la communauté" onPress={() => router.push('/login')} />
        <Button label="Explorer l’entraide" variant="subtle" onPress={() => router.push('/questions')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cartes du web : rounded-xl, bordure 1 px (l'ombre vient de cardShadow).
  block: { gap: 12, padding: space.md, borderRadius: radius.xl, borderWidth: 1 },
  cardFrame: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  welcome: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: 20 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  composerInput: { flex: 1, height: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.full, borderWidth: 1 },
  tools: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, paddingHorizontal: 6, borderRadius: radius.full },
  communityChip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 8, paddingRight: 14, borderRadius: radius.full },
  banner: { height: 80 },
  bannerBody: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md },
  bannerIcon: { marginTop: -26, borderWidth: 4, borderRadius: 40 },
});
