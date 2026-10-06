import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderActions } from '@/features/notifications';
import { RequireAuth } from '@/shared/layout';
import { useOutbox } from '@/shared/offline';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  AppBar,
  Button,
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  FilterChips,
  formatBytes,
  Icon,
  IconButton,
  Pill,
  Segmented,
  Text,
  TextField,
  utf8Size,
} from '@/shared/ui';

import { useMySnippets } from '../api';
import { SnippetCard } from '../components/SnippetCard';

type Visibility = 'all' | 'public' | 'private';

export function SnippetsScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title="Snippets" right={<HeaderActions />} />
      <RequireAuth title="Coffre de snippets" bare>
        <Vault />
      </RequireAuth>
    </SafeAreaView>
  );
}

function Vault() {
  const { colors } = useTheme();
  const snippets = useMySnippets();
  const pending = useOutbox('snippets').filter((entry) => entry.op === 'PUT');
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [language, setLanguage] = useState('all');

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const snippet of snippets.items) counts.set(snippet.language, (counts.get(snippet.language) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [snippets.items]);

  const visible = snippets.items.filter((snippet) => {
    if (visibility === 'public' && !snippet.is_public) return false;
    if (visibility === 'private' && snippet.is_public) return false;
    if (language !== 'all' && snippet.language !== language) return false;
    if (!query.trim()) return true;
    return `${snippet.title} ${snippet.tags.join(' ')} ${snippet.content}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  const totalSize = snippets.items.reduce((sum, snippet) => sum + utf8Size(snippet.content), 0);
  const publicCount = snippets.items.filter((snippet) => snippet.is_public).length;

  const exportVault = () =>
    void Share.share({ title: 'Coffre AfriDev', message: JSON.stringify(snippets.items, null, 2) }).catch(() => undefined);

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={visible}
        keyExtractor={(snippet) => snippet.id}
        renderItem={({ item }) => <SnippetCard snippet={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={() =>
          snippets.source === 'api' && snippets.remote.hasNextPage && !snippets.remote.isFetchingNextPage && void snippets.remote.fetchNextPage()
        }
        refreshControl={
          snippets.source === 'api' ? (
            <RefreshControl
              refreshing={snippets.remote.isRefetching}
              onRefresh={() => void snippets.remote.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={[styles.heroIcon, { backgroundColor: colors.secondary }]}>
                  <Icon name="hard-drive" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineMd">Coffre 100 % hors ligne</Text>
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {snippets.items.length} snippet{snippets.items.length > 1 ? 's' : ''} · {formatBytes(totalSize)} ·{' '}
                    {snippets.source === 'local' ? 'copie SQLite' : 'cache local'}
                  </Text>
                </View>
                <IconButton icon="share" label="Exporter le coffre (JSON)" tone="muted" onPress={exportVault} />
              </View>
              <Button label="Nouveau snippet" icon="plus" onPress={() => router.push('/snippet/edit')} />
            </View>
            <TextField
              value={query}
              onChangeText={setQuery}
              icon="search"
              placeholder="Rechercher une fonction, un mot-clé…"
              autoCapitalize="none"
              accessibilityLabel="Rechercher dans mes snippets"
            />
            <Segmented
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'all', label: 'Tous', count: snippets.items.length },
                { value: 'public', label: 'Publics', count: publicCount },
                { value: 'private', label: 'Privés', count: snippets.items.length - publicCount },
              ]}
            />
            {languages.length > 1 ? (
              <FilterChips
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'all', label: 'Tous', count: snippets.items.length },
                  ...languages.map(([lang, count]) => ({ value: lang, label: lang, count })),
                ]}
              />
            ) : null}
            {snippets.items.length ? (
              <Text variant="monoSm" tone="muted">
                ← Glissez une carte pour publier ou effacer
              </Text>
            ) : null}
            {pending.map((entry) => (
              <View key={entry.id} style={[styles.pending, { borderColor: colors.tertiary }]}>
                <Icon name="clock" size={18} tone="tertiary" />
                <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                  {String(entry.data.title)}
                </Text>
                <Pill tone="warning" label="En attente" />
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          snippets.isPending ? (
            <View style={{ gap: space.md }}>
              <CardSkeleton lines={3} />
              <CardSkeleton lines={3} />
            </View>
          ) : snippets.isError ? (
            <ErrorNotice message="Votre coffre s'affichera dès le retour du réseau, puis restera disponible hors ligne." />
          ) : (
            <EmptyState
              icon="code"
              title={snippets.items.length ? 'Aucun snippet ne correspond' : 'Votre coffre est vide'}
              message="Gardez ici vos commandes Docker, scripts USSD ou recettes mobile money, même sans connexion."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Carte du web (rounded-xl, bordure, ombre légère).
  hero: { gap: space.md, padding: space.md, borderRadius: radius.xl, borderWidth: 1, ...cardShadow },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pending: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
});
