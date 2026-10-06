import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/shared/theme';
import { communityColor, formatCount, Icon, Pill, Tag, Text } from '@/shared/ui';

import { type Project, repoSlug } from '../api';

export const ProjectCard = memo(function ProjectCard({
  project,
  score,
  matched,
}: {
  /** Les recommandations renvoient une version abrégée du projet. */
  project: Pick<Project, 'id' | 'name' | 'description' | 'repo_url' | 'tags' | 'stars'> & Partial<Project>;
  score?: number;
  matched?: string[];
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(`/project/${project.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.container : colors.card, borderColor: colors.border }]}
    >
      <View style={styles.top}>
        <View style={[styles.logo, { backgroundColor: communityColor(project.name) }]}>
          <Text variant="headlineMd" style={{ color: '#FFFFFF' }}>
            {project.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="headlineMd" numberOfLines={1}>
            {project.name}
          </Text>
          {project.repo_url ? (
            <Text variant="monoSm" tone="muted" numberOfLines={1}>
              {repoSlug(project.repo_url)}
            </Text>
          ) : null}
        </View>
        {score !== undefined ? <Pill tone="mint" label={`${Math.round(score * 100)} % match`} /> : null}
      </View>
      {project.description ? (
        <Text tone="muted" numberOfLines={3}>
          {project.description}
        </Text>
      ) : null}
      {project.tags.length ? (
        <View style={styles.tags}>
          {project.tags.slice(0, 5).map((tag) => (
            <Tag key={tag} label={tag} active={matched?.includes(tag)} />
          ))}
        </View>
      ) : null}
      <View style={styles.footer}>
        <Icon name="star" size={14} tone="muted" />
        <Text variant="monoSm" tone="muted">
          {formatCount(project.stars)}
        </Text>
        {project.language ? (
          <Text variant="monoSm" tone="muted">
            · {project.language}
          </Text>
        ) : null}
        <View style={{ flex: 1 }} />
        {project.is_recruiting ? <Pill tone="primary" dot label="Recrute" /> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.md, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
