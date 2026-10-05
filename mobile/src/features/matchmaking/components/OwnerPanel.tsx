import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/shared/theme';
import { Avatar, Button, Card, Pill, SectionTitle, Tag, Text, timeAgo } from '@/shared/ui';

import { useAnswerApplication, useCandidates, useProjectApplications } from '../api';

/** Vue du porteur : candidatures reçues et développeurs recommandés pour son projet. */
export function OwnerPanel({ projectId }: { projectId: string }) {
  const { colors } = useTheme();
  const applications = useProjectApplications(projectId, true);
  const candidates = useCandidates(projectId, true);
  const answer = useAnswerApplication(projectId);

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="Candidatures reçues" hint={applications.data ? `${applications.data.length} au total` : undefined} />
      {applications.data?.length ? (
        applications.data.map((application) => {
          const name = application.candidate?.display_name || application.candidate?.username || 'Membre';
          return (
            <Card key={application.id} style={{ gap: space.sm }}>
              <Pressable
                onPress={() => application.candidate && router.push(`/u/${application.candidate.username}`)}
                accessibilityRole="link"
                style={styles.row}
              >
                <Avatar name={name} uri={application.candidate?.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{name}</Text>
                  <Text variant="monoSm" tone="faint">
                    {timeAgo(application.created_at)}
                  </Text>
                </View>
                {application.status !== 'pending' ? (
                  <Pill tone={application.status === 'accepted' ? 'success' : 'neutral'} label={application.status === 'accepted' ? 'Acceptée' : 'Déclinée'} />
                ) : null}
              </Pressable>
              {application.message ? <Text>{application.message}</Text> : null}
              {application.status === 'pending' ? (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Button label="Accepter" icon="check" variant="secondary" size="sm" onPress={() => answer.mutate({ id: application.id, accept: true })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Décliner" icon="x" variant="ghost" size="sm" onPress={() => answer.mutate({ id: application.id, accept: false })} />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })
      ) : (
        <Text tone="muted">Aucune candidature pour l’instant.</Text>
      )}

      <SectionTitle title="Développeurs recommandés" />
      {candidates.data?.length ? (
        candidates.data.slice(0, 6).map(({ candidate, score, matched }) => (
          <Pressable
            key={candidate.id}
            onPress={() => router.push(`/u/${candidate.username}`)}
            accessibilityRole="link"
            style={[styles.candidate, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Avatar name={candidate.display_name} uri={candidate.avatar_url} size={40} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyMedium">{candidate.display_name}</Text>
              <Text variant="monoSm" tone="secondary">
                {Math.round(score * 100)} % d’affinité
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {matched.map((skill) => (
                  <Tag key={skill} label={skill} />
                ))}
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <Text tone="muted">Ajoutez les technologies du projet pour recevoir des suggestions de profils.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  candidate: { flexDirection: 'row', gap: space.sm, padding: 12, borderRadius: radius.lg, borderWidth: 1 },
});
