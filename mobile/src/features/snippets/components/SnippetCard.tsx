import { router } from 'expo-router';
import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { errorMessage } from '@/shared/api';
import { radius, space, useTheme } from '@/shared/theme';
import { copyText, formatBytes, Icon, type IconName, IconButton, Pill, Tag, Text, timeAgo, useToast, utf8Size } from '@/shared/ui';

import { reviewOf, type Snippet, useSnippetActions } from '../api';

/** Carte du coffre : glisser vers la gauche pour publier / dépublier ou supprimer. */
export function SnippetCard({ snippet }: { snippet: Snippet }) {
  const { colors } = useTheme();
  const toast = useToast();
  const swipe = useRef<SwipeableMethods>(null);
  const { publish, remove } = useSnippetActions();
  const review = reviewOf(snippet);
  const flagged = review.risky && !snippet.is_public;

  const togglePublic = () => {
    swipe.current?.close();
    publish.mutate(
      { id: snippet.id, value: !snippet.is_public },
      {
        onSuccess: () => toast(snippet.is_public ? 'Snippet repassé en privé.' : 'Snippet publié dans la communauté.'),
        onError: (e) => toast(errorMessage(e), 'error'),
      },
    );
  };
  const confirmDelete = () => {
    swipe.current?.close();
    Alert.alert('Supprimer ce snippet ?', snippet.title, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(snippet.id) },
    ]);
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          <SwipeAction
            icon={snippet.is_public ? 'lock' : 'globe'}
            label={snippet.is_public ? 'Privé' : 'Publier'}
            color={colors.secondary}
            onPress={togglePublic}
          />
          <SwipeAction icon="trash-2" label="Effacer" color={colors.danger} onPress={confirmDelete} />
        </View>
      )}
    >
      <Pressable
        onPress={() => router.push(`/snippet/${snippet.id}`)}
        accessibilityRole="button"
        accessibilityHint="Glissez vers la gauche pour publier ou supprimer"
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {flagged ? (
          <View style={[styles.flag, { backgroundColor: colors.tertiarySoft }]}>
            <Icon name="alert-triangle" size={18} tone="tertiary" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" tone="tertiary">
                Repassé en privé : donnée sensible probable
              </Text>
              <Text variant="small" tone="tertiary">
                {review.reasons.join(' ') || 'Le Security Guard a détecté une clé ou un jeton.'}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.meta}>
          <Pill label={snippet.language} />
          {snippet.is_public ? <Pill tone="mint" icon="globe" label="Public" /> : <Pill icon="lock" label="Privé" />}
          <View style={{ flex: 1 }} />
          <Text variant="monoSm" tone="faint">
            {formatBytes(utf8Size(snippet.content))} · {timeAgo(snippet.updated_at)}
          </Text>
        </View>
        <Text variant="headlineMd" numberOfLines={2}>
          {snippet.title}
        </Text>
        {snippet.tags.length ? (
          <View style={styles.tags}>
            {snippet.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </View>
        ) : null}
        <View style={styles.footer}>
          {flagged ? (
            <Pressable
              onPress={() => router.push({ pathname: '/snippet/edit', params: { id: snippet.id } })}
              accessibilityRole="button"
              style={[styles.review, { backgroundColor: colors.tertiary }]}
            >
              <Icon name="shield" size={16} color="#FFFFFF" />
              <Text variant="label" style={{ color: '#FFFFFF' }}>
                Corriger le secret
              </Text>
            </Pressable>
          ) : (
            <Text variant="monoSm" tone="secondary">
              ✓ Disponible hors ligne
            </Text>
          )}
          <View style={{ flex: 1 }} />
          <IconButton
            icon="copy"
            label="Copier le code"
            tone="muted"
            onPress={() => void copyText(snippet.content).then(() => toast('Code copié.'))}
          />
          <IconButton icon="edit-2" label="Modifier" tone="muted" onPress={() => router.push({ pathname: '/snippet/edit', params: { id: snippet.id } })} />
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

function SwipeAction({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.action, { backgroundColor: color }]}>
      <Icon name={icon} size={22} color="#FFFFFF" />
      <Text variant="label" style={{ color: '#FFFFFF' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.md, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  flag: { flexDirection: 'row', gap: space.sm, padding: 12, borderRadius: radius.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.md },
  actions: { flexDirection: 'row', marginLeft: space.sm, borderRadius: radius.lg, overflow: 'hidden' },
  action: { width: 84, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
