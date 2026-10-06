import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, unwrap } from '@/shared/api';
import { useDebounced } from '@/shared/hooks';
import { routeForWebPath } from '@/shared/navigation';
import { radius, space, useTheme } from '@/shared/theme';
import {
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  FilterChips,
  Icon,
  type IconName,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  TextField,
} from '@/shared/ui';

type SourceType = 'all' | 'snippet' | 'question' | 'project';
type Mode = 'text' | 'semantic';

const ICONS: Record<Exclude<SourceType, 'all'>, IconName> = { snippet: 'code', question: 'message-circle', project: 'git-branch' };
const LABELS: Record<Exclude<SourceType, 'all'>, string> = { snippet: 'Snippet', question: 'Question résolue', project: 'Projet' };

/** Recherche dans la base de connaissances : tolérante aux fautes, ou par le sens. */
export function SearchScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [type, setType] = useState<SourceType>('all');
  const [mode, setMode] = useState<Mode>('text');
  const q = useDebounced(text.trim(), 450);

  const results = useQuery({
    queryKey: ['search', q, type, mode],
    queryFn: () => unwrap(api.GET('/api/knowledge/search/', { params: { query: { q, type: type === 'all' ? undefined : type, mode } } })),
    enabled: q.length > 1,
    meta: { persist: false },
  });

  return (
    <Screen header={<ScreenHeader title="Rechercher" back />}>
      <TextField
        value={text}
        onChangeText={setText}
        icon="search"
        placeholder="Bug, fonction, techno…"
        autoFocus={!params.q}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Rechercher"
      />
      <FilterChips<SourceType>
        value={type}
        onChange={setType}
        options={[
          { value: 'all', label: 'Tout' },
          { value: 'snippet', label: 'Snippets', icon: 'code' },
          { value: 'question', label: 'Questions', icon: 'message-circle' },
          { value: 'project', label: 'Projets', icon: 'git-branch' },
        ]}
      />
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'text', label: 'Mots-clés' },
          { value: 'semantic', label: 'Par le sens (IA)' },
        ]}
      />
      {q.length < 2 ? (
        <EmptyState icon="search" title="Que cherchez-vous ?" message="Snippets publics, questions résolues et projets de la communauté." />
      ) : results.isPending ? (
        <CardSkeleton lines={2} />
      ) : results.isError ? (
        <ErrorNotice message="La recherche nécessite une connexion." />
      ) : !results.data?.length ? (
        <EmptyState icon="inbox" title="Aucun résultat" message="Essayez la recherche « Par le sens » ou d’autres mots-clés." />
      ) : (
        <View style={{ gap: space.sm }}>
          {results.data.map((hit) => (
            <Pressable
              key={`${hit.source_type}-${hit.source_id}`}
              onPress={() => {
                const route = routeForWebPath(hit.url);
                if (route) router.push(route as never);
              }}
              accessibilityRole="link"
              style={({ pressed }) => [styles.hit, { backgroundColor: pressed ? colors.container : colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Icon name={ICONS[hit.source_type]} size={18} tone="primary" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="monoSm" tone="muted">
                  {LABELS[hit.source_type].toUpperCase()}
                </Text>
                <Text variant="bodyMedium">{hit.title}</Text>
                <Text variant="small" tone="muted" numberOfLines={2}>
                  {hit.excerpt}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hit: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
