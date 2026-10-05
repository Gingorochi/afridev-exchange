import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { ApplyButton, OwnerPanel } from '@/features/matchmaking';
import { ProjectGuide } from '@/features/onboarding-agent';
import { PUBLIC_WEB_URL } from '@/shared/api';
import { useSession } from '@/shared/session';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  Avatar,
  Button,
  Card,
  CardSkeleton,
  communityColor,
  ErrorNotice,
  formatCount,
  Icon,
  IconButton,
  Pill,
  Screen,
  ScreenHeader,
  Segmented,
  Tag,
  Text,
  timeAgo,
} from '@/shared/ui';

import { type Project, repoSlug, useIssues, useProject, useProjectActions } from '../api';

type Tab = 'overview' | 'issues' | 'guide' | 'team';

export function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  return (
    <Screen
      header={
        <ScreenHeader
          title="Projet"
          back
          right={
            project.data ? (
              <IconButton
                icon="share-2"
                label="Partager"
                onPress={() => void Share.share({ message: `${project.data.name}\n${PUBLIC_WEB_URL}/projects/${project.data.id}` }).catch(() => undefined)}
              />
            ) : null
          }
        />
      }
      refreshing={project.isRefetching}
      onRefresh={() => void project.refetch()}
      footer={project.data ? <Footer project={project.data} /> : null}
    >
      {project.data ? (
        <ProjectView project={project.data} />
      ) : project.isPending ? (
        <CardSkeleton lines={6} />
      ) : (
        <ErrorNotice title="Projet introuvable." message="Il a peut-être été retiré, ou n'est pas encore sur ce téléphone." />
      )}
    </Screen>
  );
}

function Footer({ project }: { project: Project }) {
  const { user } = useSession();
  const mine = Boolean(user && project.owner?.id === user.id);
  if (mine) {
    return <Button label="Modifier le projet" icon="edit-2" size="lg" variant="ghost" onPress={() => router.push({ pathname: '/project/new', params: { id: project.id } })} />;
  }
  return <ApplyButton projectId={project.id} ownerUsername={project.owner?.username} />;
}

function ProjectView({ project }: { project: Project }) {
  const { colors } = useTheme();
  const { user } = useSession();
  const mine = Boolean(user && project.owner?.id === user.id);
  const [tab, setTab] = useState<Tab>('overview');
  const { sync, remove } = useProjectActions(project.id);
  const owner = project.owner;

  return (
    <>
      {/* En-tête bord à bord : bannière à la couleur du projet, logo qui la chevauche (comme le web). */}
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient
          colors={[colors.secondary, colors.secondaryHover, colors.tertiary]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.6 }}
          style={styles.banner}
        />
        <View style={styles.heroBody}>
          <View style={[styles.logo, { backgroundColor: communityColor(project.name), borderColor: colors.card }]}>
            <Text variant="headlineXl" style={{ color: '#FFFFFF' }}>
              {project.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text variant="headlineXl">{project.name}</Text>
          {project.repo_url ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {repoSlug(project.repo_url)}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <Pill icon="star" label={formatCount(project.stars)} />
            {project.language ? <Pill label={project.language} /> : null}
            {project.is_recruiting ? <Pill tone="mint" dot label="Recrute activement" /> : null}
          </View>
          {owner ? (
            <Pressable onPress={() => router.push(`/u/${owner.username}`)} accessibilityRole="link" style={styles.owner}>
              <Avatar name={owner.display_name} uri={owner.avatar_url} size={32} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{owner.display_name}</Text>
                <Text variant="monoSm" tone="muted">
                  @{owner.username} · porteur du projet
                </Text>
              </View>
              <Icon name="chevron-right" tone="faint" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Aperçu' },
          { value: 'issues', label: 'Issues' },
          { value: 'guide', label: 'Guide IA' },
          ...(mine ? [{ value: 'team' as const, label: 'Équipe' }] : []),
        ]}
      />

      {tab === 'overview' ? (
        <View style={{ gap: space.md }}>
          {project.description ? <Text variant="bodyLg">{project.description}</Text> : null}
          {project.tags.length ? (
            <View style={{ gap: space.sm }}>
              <Text variant="label">Stack technique</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {project.tags.map((tag) => (
                  <Tag key={tag} label={tag} />
                ))}
              </View>
            </View>
          ) : null}
          {project.last_synced_at ? (
            <Text variant="monoSm" tone="muted">
              Synchronisé avec GitHub {timeAgo(project.last_synced_at)}
            </Text>
          ) : null}
          {project.repo_url ? (
            <Button label="Voir le dépôt GitHub" icon="github" variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(project.repo_url)} />
          ) : null}
          {mine ? (
            <>
              {project.repo_url ? (
                <Button label="Synchroniser GitHub" icon="refresh-cw" variant="ghost" loading={sync.isPending} onPress={() => sync.mutate()} />
              ) : null}
              <Button
                label="Retirer le projet"
                icon="trash-2"
                variant="ghost"
                onPress={() =>
                  Alert.alert('Retirer ce projet ?', project.name, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Retirer', style: 'destructive', onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }) },
                  ])
                }
              />
            </>
          ) : null}
        </View>
      ) : tab === 'issues' ? (
        <GoodFirstIssues projectId={project.id} />
      ) : tab === 'guide' ? (
        <ProjectGuide projectId={project.id} repoUrl={project.repo_url} />
      ) : (
        <OwnerPanel projectId={project.id} />
      )}
    </>
  );
}

function GoodFirstIssues({ projectId }: { projectId: string }) {
  const { colors } = useTheme();
  const issues = useIssues(projectId);
  if (issues.isPending) return <CardSkeleton lines={2} />;
  if (!issues.data?.length) {
    return <Text tone="muted">Aucune « good first issue » ouverte pour l’instant.</Text>;
  }
  return (
    <View style={{ gap: space.md }}>
      <Text variant="small" tone="muted">
        Importées du dépôt GitHub : idéales pour une première contribution.
      </Text>
      {issues.data.map((issue) => (
        <Card key={issue.id} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text variant="mono" tone="primary">
              #{issue.number}
            </Text>
            {issue.labels.map((label) => (
              <Pill key={label} tone={/first|débutant/i.test(label) ? 'mint' : 'neutral'} label={label} />
            ))}
          </View>
          <Text variant="bodyMedium">{issue.title}</Text>
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(issue.url)}
            accessibilityRole="link"
            style={[styles.issueLink, { borderColor: colors.border }]}
          >
            <Text variant="label" tone="primary">
              Je prends cette issue
            </Text>
            <Icon name="external-link" size={16} tone="primary" />
          </Pressable>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Carte du web : bannière en dégradé, logo qui la chevauche.
  hero: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...cardShadow },
  banner: { height: 88, overflow: 'hidden' },
  heroBody: { paddingHorizontal: space.md, paddingBottom: space.md, gap: 2 },
  logo: {
    width: 72,
    height: 72,
    marginTop: -36,
    marginBottom: 8,
    borderRadius: radius.xl,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  owner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, marginTop: space.sm },
  issueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
