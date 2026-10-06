import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { cardShadow, fonts, radius, space, useTheme } from '@/shared/theme';
import { Avatar, CommunityIcon, Icon, Tag, Text, timeAgo } from '@/shared/ui';

import type { Question } from '../api';

/** Question dans une liste (bord à bord, comme les publications du fil). */
export const QuestionCard = memo(function QuestionCard({ question }: { question: Question }) {
  const { colors } = useTheme();
  const name = question.author?.display_name || question.author?.username || 'Membre';
  const [community] = question.tags;
  const ai = question.ai_answer_status === 'ready';

  const status = question.is_resolved
    ? { label: 'Résolue', icon: 'check-circle' as const, bg: colors.secondary, fg: '#FFFFFF' }
    : question.answer_count
      ? {
          label: `${question.answer_count} réponse${question.answer_count > 1 ? 's' : ''}`,
          icon: 'message-circle' as const,
          bg: colors.container,
          fg: colors.ink,
        }
      : { label: 'En attente de réponse', icon: 'clock' as const, bg: colors.tertiarySoft, fg: colors.onTertiarySoft };

  return (
    <Pressable
      onPress={() => router.push(`/question/${question.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, cardShadow, { backgroundColor: colors.card, borderColor: pressed ? colors.borderStrong : colors.border }]}
    >
      {/* « d/communauté • avatar auteur • date », comme le web. */}
      <View style={styles.meta}>
        {community ? (
          <>
            <CommunityIcon tag={community} size={22} />
            <Text variant="label" style={{ fontFamily: fonts.bold, flexShrink: 0 }} numberOfLines={1}>
              d/{community}
            </Text>
            <Text variant="small" tone="faint">
              •
            </Text>
          </>
        ) : null}
        <Avatar name={name} uri={question.author?.avatar_url} size={18} />
        <Text variant="small" tone="muted" numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.medium }}>
          {name}
        </Text>
        <Text variant="small" tone="faint" numberOfLines={1} style={{ flexShrink: 0 }}>
          • {timeAgo(question.created_at)}
        </Text>
      </View>
      <Text variant="headlineMd" numberOfLines={3}>
        {question.title}
      </Text>
      {question.body ? (
        <Text tone="muted" numberOfLines={2}>
          {question.body}
        </Text>
      ) : null}
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Icon name={status.icon} size={15} color={status.fg} />
          <Text variant="label" style={{ color: status.fg }}>
            {status.label}
          </Text>
        </View>
        {ai ? (
          <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
            <Icon name="zap" size={15} tone="primary" />
            <Text variant="label" tone="primary">
              Réponse IA
            </Text>
          </View>
        ) : null}
        {question.tags.slice(1, 3).map((other) => (
          <Tag key={other} label={other} />
        ))}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Carte du web (rounded-xl, bordure, ombre légère) ; la marge vient de la liste.
  card: { gap: 8, padding: space.md, borderRadius: radius.xl, borderWidth: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: radius.full },
});
