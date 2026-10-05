import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderActions } from '@/features/notifications';
import { useDebounced } from '@/shared/hooks';
import { useOutbox } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { cardShadow, fonts, noFocusRing, radius, space, useTheme } from '@/shared/theme';
import { AppBar, Avatar, CardSkeleton, EmptyState, ErrorNotice, Icon, OfflineBanner, Pill, Tabs, Text } from '@/shared/ui';

import { useQuestions } from '../api';
import { QuestionCard } from '../components/QuestionCard';

type Status = 'all' | 'open' | 'resolved';

export function QuestionsScreen() {
  const { colors } = useTheme();
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [status, setStatus] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 500);
  const list = useQuestions({
    q: q || undefined,
    tag: tag || undefined,
    resolved: status === 'all' ? undefined : status === 'resolved',
  });
  const pending = useOutbox('questions');
  const { isAuthenticated, profile } = useSession();

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title="Entraide" right={<HeaderActions />} />
      <OfflineBanner />
      <FlashList
        data={list.items}
        keyExtractor={(question) => question.id}
        renderItem={({ item }) => <QuestionCard question={item} />}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        contentContainerStyle={{ padding: GAP, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View style={{ gap: GAP, marginBottom: GAP }}>
            {/* En-tête du web : dégradé secondary-soft → primary-soft, puis la barre « poser une question ». */}
            <View style={[styles.card, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={[colors.secondarySoft, colors.primarySoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={styles.hero}>
                <View style={[styles.heroIcon, { backgroundColor: colors.secondary }]}>
                  <Icon name="messages-square" size={26} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineLg">Entraide & IA</Text>
                  <Text tone="muted">Une première réponse de l’IA en quelques secondes, puis l’expertise des développeurs du continent.</Text>
                </View>
              </LinearGradient>
              <View style={[styles.askRow, { borderTopColor: colors.border }]}>
                {isAuthenticated ? <Avatar name={profile?.display_name || profile?.username || '?'} uri={profile?.avatar_url} size={40} /> : null}
                <Pressable
                  onPress={() => router.push(isAuthenticated ? '/compose/question' : '/login')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ask, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.container : colors.card }]}
                >
                  <Text tone="muted" style={{ flex: 1 }} numberOfLines={2}>
                    Bloqué sur un bug ? Posez votre question…
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={[styles.card, styles.searchCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.search, { backgroundColor: colors.container }]}>
                <Icon name="search" size={18} tone="faint" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher un bug, un code d'erreur, une techno…"
                  placeholderTextColor={colors.inkFaint}
                  returnKeyType="search"
                  accessibilityLabel="Rechercher dans les questions"
                  style={[styles.searchInput, noFocusRing, { color: colors.ink, fontFamily: fonts.regular }]}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.sm }}>
                <View style={{ flexShrink: 1 }}>
                  <Tabs<Status>
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'all', label: 'Toutes' },
                      { value: 'open', label: 'Sans solution' },
                      { value: 'resolved', label: 'Résolues' },
                    ]}
                  />
                </View>
                {tag ? (
                  <Pressable onPress={() => router.setParams({ tag: '' })} accessibilityRole="button" style={[styles.tagFilter, { backgroundColor: colors.primarySoft }]}>
                    <Text variant="label" tone="primary">
                      d/{tag}
                    </Text>
                    <Icon name="x" size={14} tone="primary" />
                  </Pressable>
                ) : null}
              </View>
            </View>
            {pending.map((entry) => (
              <View key={entry.id} style={[styles.card, { padding: space.md, gap: 8, borderColor: colors.tertiary, backgroundColor: colors.card, borderStyle: 'dashed' }]}>
                <Pill tone="warning" icon="clock" label="Envoi au retour du réseau" />
                <Text variant="bodyMedium">{String(entry.data.title ?? '')}</Text>
              </View>
            ))}
          </View>
        }        ListEmptyComponent={
          list.isPending ? (
            <View style={{ gap: GAP }}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : list.isError ? (
            <View>
              <ErrorNotice message="Les questions s'afficheront dès le retour du réseau." />
            </View>
          ) : (
            <View>
              <EmptyState
                icon="help-circle"
                title={q ? 'Aucun résultat' : 'Aucune question'}
                message="Posez la vôtre : l’IA propose une première piste en quelques secondes."
              />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

/** Marge et espacement des cartes, comme le web sur téléphone. */
const GAP = 12;

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 20 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.md, borderTopWidth: 1 },
  ask: { flex: 1, minHeight: 48, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 18, borderRadius: radius.full, borderWidth: 1 },
  searchCard: { paddingHorizontal: space.md, paddingTop: 12, overflow: 'visible' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14, borderRadius: radius.full },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, height: 42 },
  tagFilter: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 30, paddingHorizontal: 12, borderRadius: radius.full },
});