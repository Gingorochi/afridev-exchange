import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyApplications, useRecommendedProjects } from '@/features/matchmaking';
import { HeaderActions } from '@/features/notifications';
import { useSession } from '@/shared/session';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  AppBar,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  Icon,
  Pill,
  Screen,
  Segmented,
  Text,
  timeAgo,
} from '@/shared/ui';

import { useProjects } from '../api';
import { ProjectCard } from '../components/ProjectCard';

type Tab = 'recommended' | 'all' | 'mine';

export function ProjectsScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const [tab, setTab] = useState<Tab>(isAuthenticated ? 'recommended' : 'all');
  const recommended = useRecommendedProjects();
  const applications = useMyApplications();
  const projects = useProjects({}, tab === 'all');
  const current = tab === 'all' ? projects : tab === 'recommended' ? recommended : applications;

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title="Projets" right={<HeaderActions />} />
      <Screen embedded refreshing={current.isRefetching} onRefresh={() => void current.refetch()}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={[styles.heroIcon, { backgroundColor: colors.tertiary }]}>
              <Icon name="git-branch" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headlineMd">Open source africain</Text>
              <Text variant="small" tone="muted">
                Contribuez aux projets de la communauté ou trouvez des renforts.
              </Text>
            </View>
          </View>
          {isAuthenticated ? <Button label="Proposer un projet" icon="plus" onPress={() => router.push('/project/new')} /> : null}
        </View>
        {isAuthenticated ? (
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'recommended', label: 'Pour vous', count: recommended.data?.length },
              { value: 'all', label: 'Tous' },
              { value: 'mine', label: 'Mes candid.', count: applications.data?.length },
            ]}
          />
        ) : null}
        {tab === 'recommended' ? <Recommended /> : tab === 'mine' ? <MyApplications /> : <AllProjects />}
      </Screen>
    </SafeAreaView>
  );
}

function Recommended() {
  const { colors } = useTheme();
  const { profile } = useSession();
  const recommended = useRecommendedProjects();
  return (
    <View style={{ gap: space.md }}>
      {profile && !profile.stack.length ? (
        <Card tinted style={{ gap: space.sm }}>
          <Text>Renseignez votre stack technique pour recevoir des recommandations.</Text>
          <Button label="Compléter mon profil" size="sm" onPress={() => router.push('/profile')} />
        </Card>
      ) : null}
      {recommended.data?.length ? (
        <View style={[styles.match, { backgroundColor: colors.primarySoft }]}>
          <Icon name="zap" size={20} tone="primary" />
          <Text style={{ flex: 1 }}>
            Vous maîtrisez{' '}
            <Text variant="mono" tone="primary">
              {profile?.stack.slice(0, 3).join(', ')}
            </Text>{' '}
            : {recommended.data.length} projet{recommended.data.length > 1 ? 's' : ''} recherchent vos compétences.
          </Text>
        </View>
      ) : null}
      {recommended.isPending ? (
        <CardSkeleton />
      ) : recommended.data?.length ? (
        recommended.data.map(({ project, score, matched }) => <ProjectCard key={project.id} project={project} score={score} matched={matched} />)
      ) : profile?.stack.length ? (
        <EmptyState icon="git-branch" title="Pas encore de projet correspondant" message="Explorez tous les projets ou proposez le vôtre." />
      ) : null}
    </View>
  );
}

function MyApplications() {
  const { colors } = useTheme();
  const applications = useMyApplications();
  if (applications.isPending) return <CardSkeleton lines={2} />;
  if (!applications.data?.length) {
    return <EmptyState icon="git-pull-request" title="Aucune candidature en cours" message="Proposez votre aide sur un projet : son porteur sera prévenu tout de suite." />;
  }
  return (
    <View style={{ gap: space.sm }}>
      {applications.data.map((application) => (
        <Pressable
          key={application.id}
          onPress={() => router.push(`/project/${application.project_id}`)}
          accessibilityRole="link"
          style={[styles.application, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">Voir le projet</Text>
            <Text variant="monoSm" tone="muted">
              Candidature {timeAgo(application.created_at)}
            </Text>
          </View>
          <Pill
            tone={application.status === 'accepted' ? 'success' : application.status === 'declined' ? 'neutral' : 'warning'}
            label={{ pending: 'En attente', accepted: 'Acceptée', declined: 'Déclinée' }[application.status]}
          />
        </Pressable>
      ))}
    </View>
  );
}

function AllProjects() {
  const projects = useProjects();
  if (projects.isPending) {
    return (
      <View style={{ gap: space.md }}>
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  }
  if (projects.isError && !projects.items.length) return <ErrorNotice message="Les projets s'afficheront dès le retour du réseau." />;
  if (!projects.items.length) {
    return <EmptyState icon="git-branch" title="Aucun projet pour l’instant" message="Partagez votre projet open source pour trouver des contributeurs." />;
  }
  return (
    <View style={{ gap: space.md }}>
      {projects.items.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
      {projects.hasNextPage ? (
        <Button label="Charger plus" variant="ghost" loading={projects.isFetchingNextPage} onPress={() => projects.fetchNextPage()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Carte d'en-tête, comme sur le web.
  hero: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...cardShadow,
  },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  match: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.lg },
  application: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
});
