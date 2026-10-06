import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { radius, space, useTheme } from '@/shared/theme';
import { Button, CardSkeleton, Icon, Markdown, Pill, Screen, ScreenHeader, Text, timeAgo } from '@/shared/ui';

import { type Guide, useGuide, useProjectGuides, useRequestGuide } from '../api';

/** Onglet « Guide IA » d'un projet : génération à la demande, suivi, lecture. */
export function ProjectGuide({ projectId, repoUrl }: { projectId: string; repoUrl: string }) {
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const existing = useProjectGuides(projectId);
  const request = useRequestGuide();
  const [guideId, setGuideId] = useState<string | null>(null);
  const current = useGuide(guideId ?? existing.data?.[0]?.id ?? null);

  if (!repoUrl) {
    return <Text tone="muted">Le porteur doit ajouter le dépôt GitHub du projet pour générer un guide de démarrage.</Text>;
  }

  const start = async () => {
    const guide = await request.mutateAsync({ repo_url: repoUrl, project_id: projectId });
    setGuideId(guide.id);
  };

  if (!current.data) {
    return (
      <View style={[styles.empty, { borderColor: colors.borderStrong, backgroundColor: colors.container }]}>
        <View style={[styles.bot, { backgroundColor: colors.primarySoft }]}>
          <Icon name="cpu" size={28} tone="primary" />
        </View>
        <Text variant="headlineMd" center>
          Guide de démarrage IA
        </Text>
        <Text tone="muted" center>
          L’agent lit le dépôt (README, configuration, arborescence, good first issues) et rédige un guide pour votre
          première contribution.
        </Text>
        {existing.isPending ? (
          <CardSkeleton lines={2} />
        ) : isAuthenticated ? (
          <Button label="Générer le guide" icon="zap" loading={request.isPending} onPress={() => void start()} />
        ) : (
          <Button label="Se connecter pour générer le guide" icon="log-in" onPress={() => router.push('/login')} />
        )}
        {request.isError ? (
          <Text variant="small" tone="danger">
            {errorMessage(request.error)}
          </Text>
        ) : null}
      </View>
    );
  }
  return <GuideView guide={current.data} onRetry={isAuthenticated ? () => void start() : undefined} retrying={request.isPending} />;
}

export function GuideView({ guide, onRetry, retrying }: { guide: Guide; onRetry?: () => void; retrying?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Guide de démarrage">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMd">Guide de démarrage IA</Text>
          <Text variant="monoSm" tone="muted">
            {guide.repo_url.replace('https://github.com/', '')}
            {guide.commit_sha ? ` · ${guide.commit_sha.slice(0, 7)}` : ''} · {timeAgo(guide.updated_at)}
          </Text>
        </View>
        <Pill
          tone={guide.status === 'ready' ? 'success' : guide.status === 'pending' ? 'warning' : 'danger'}
          label={{ ready: 'Prêt', pending: 'Lecture du dépôt…', failed: 'Échec' }[guide.status]}
        />
      </View>
      {guide.status === 'pending' ? (
        <CardSkeleton lines={5} />
      ) : guide.status === 'ready' ? (
        <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Markdown source={guide.content} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Text tone="danger">{guide.error || 'Le guide n’a pas pu être généré.'}</Text>
          {onRetry ? <Button label="Réessayer" icon="refresh-cw" variant="ghost" size="sm" loading={retrying} onPress={onRetry} /> : null}
        </View>
      )}
    </View>
  );
}

/** Écran d'un guide (lien des notifications « Votre guide est prêt »). */
export function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = useGuide(id);
  return (
    <Screen header={<ScreenHeader title="Guide de démarrage" back />} refreshing={guide.isRefetching} onRefresh={() => void guide.refetch()}>
      {guide.data ? <GuideView guide={guide.data} /> : <CardSkeleton lines={6} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  bot: { width: 56, height: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  content: { padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
});
