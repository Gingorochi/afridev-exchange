import { router } from 'expo-router';
import { memo } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { ReportButton } from '@/features/moderation';
import { TranslateButton } from '@/features/translation';
import { PUBLIC_WEB_URL } from '@/shared/api';
import { type MediaAsset, MediaView } from '@/shared/media';
import { useSession } from '@/shared/session';
import { cardShadow, fonts, radius, space, useTheme } from '@/shared/theme';
import {
  Avatar,
  CommunityIcon,
  formatCount,
  HubIcon,
  Icon,
  Markdown,
  Pill,
  PillAction,
  Reputation,
  Tag,
  Text,
  timeAgo,
} from '@/shared/ui';

import { type Post, useDeletePost, useLike, useVote } from '../api';

/**
 * Publication façon Reddit mobile : bord à bord, « d/communauté · auteur · date »,
 * contenu, puis actions en capsules grises. « Soutenir » est le j'aime du backend.
 */
export const PostCard = memo(function PostCard({ post, detail = false }: { post: Post; detail?: boolean }) {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useSession();
  const like = useLike(post);
  const remove = useDeletePost();
  const name = post.author?.display_name || post.author?.username || 'Membre';
  const mine = Boolean(user && post.author?.id === user.id);
  const liked = Boolean(post.viewer?.liked);
  const [firstTag, ...rest] = post.tags;
  // Rangé dans un hub : le hub remplace la « communauté » (premier tag) et tous les tags restent.
  const community = post.hub ? undefined : firstTag;
  const otherTags = post.hub ? post.tags : rest;
  const open = () => router.push(`/post/${post.id}`);

  const share = () =>
    void Share.share({ message: `${post.body.slice(0, 120)}\n${PUBLIC_WEB_URL}/feed/${post.id}` }).catch(() => undefined);

  const confirmDelete = () =>
    Alert.alert('Supprimer ce post ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(post.id, { onSuccess: () => detail && router.back() }) },
    ]);

  return (
    <Pressable
      onPress={detail ? undefined : open}
      disabled={detail}
      accessibilityHint={detail ? undefined : 'Ouvre la discussion'}
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        { backgroundColor: colors.card, borderColor: pressed && !detail ? colors.borderStrong : colors.border },
      ]}
    >
      <View style={styles.meta}>
        {post.hub ? (
          <>
            <Pressable onPress={() => router.push(`/h/${post.hub!.slug}`)} hitSlop={6} style={styles.inline} accessibilityRole="link">
              <HubIcon icon={post.hub.icon} name={post.hub.name} size={22} />
              <Text variant="label" style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                h/{post.hub.slug}
              </Text>
            </Pressable>
            <Dot />
          </>
        ) : community ? (
          <>
            <Pressable
              onPress={() => router.push({ pathname: '/feed', params: { tag: community } })}
              hitSlop={6}
              style={styles.inline}
              accessibilityRole="link"
            >
              <CommunityIcon tag={community} size={22} />
              <Text variant="label" style={{ fontFamily: fonts.bold }} numberOfLines={1}>
                d/{community}
              </Text>
            </Pressable>
            <Dot />
          </>
        ) : null}
        <Pressable
          onPress={() => post.author && router.push(`/u/${post.author.username}`)}
          disabled={!post.author}
          hitSlop={6}
          style={[styles.inline, { flexShrink: 1 }]}
          accessibilityRole="link"
        >
          <Avatar name={name} uri={post.author?.avatar_url} size={community || post.hub ? 18 : 22} />
          <Text
            variant="small"
            tone={community || post.hub ? 'muted' : 'ink'}
            numberOfLines={1}
            style={{ flexShrink: 1, fontFamily: community || post.hub ? fonts.medium : fonts.bold }}
          >
            {name}
          </Text>
        </Pressable>
        <Dot />
        <Text variant="small" tone="faint" numberOfLines={1} style={{ flexShrink: 0 }}>
          {timeAgo(post.created_at)}
        </Text>
        <View style={{ flex: 1 }} />
        {post.kind === 'poll' ? <Pill tone="warning" icon="bar-chart-2" label="Sondage" /> : null}
        {post.kind === 'short' ? <Pill tone="primary" icon="film" label="Vidéo" /> : null}
        {mine ? (
          <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Supprimer le post">
            <Icon name="more-horizontal" size={20} tone="muted" />
          </Pressable>
        ) : null}
      </View>

      <Reputation karma={post.author?.karma} badge={post.author?.badges[0]?.label} />
      {post.title ? <Text variant="headlineMd">{post.title}</Text> : null}
      {post.body && !(post.kind === 'poll' && post.title) ? (
        post.kind === 'poll' ? (
          <Text variant="headlineMd">{post.body}</Text>
        ) : (
          <Markdown source={detail || post.body.length <= 500 ? post.body : `${post.body.slice(0, 500)}…`} />
        )
      ) : null}

      {post.kind === 'poll' ? <Poll post={post} canVote={isAuthenticated} /> : null}
      {/* Le schéma décrit `media` comme JSON libre : c'est la forme de /api/media/<id>/. */}
      {post.media ? <MediaView media={post.media as MediaAsset} /> : null}

      {otherTags.length ? (
        <View style={styles.tags}>
          {otherTags.map((tag) => (
            <Tag key={tag} label={tag} onPress={() => router.push({ pathname: '/feed', params: { tag } })} />
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <PillAction
          icon="arrow-big-up"
          filled={liked}
          tinted
          active={liked}
          label={formatCount(post.like_count)}
          a11y={liked ? 'Retirer mon soutien' : 'Soutenir'}
          onPress={isAuthenticated && !like.isPending ? () => like.mutate(!liked) : undefined}
        />
        <PillAction icon="message-square" label={formatCount(post.comment_count)} a11y="Commentaires" onPress={detail ? undefined : open} />
        <PillAction icon="share-2" a11y="Partager" onPress={share} />
        {post.body && post.kind !== 'poll' ? <TranslateButton text={post.body} /> : null}
        {!mine ? (
          <View style={{ marginLeft: 'auto' }}>
            <ReportButton targetType="post" targetId={post.id} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

function Dot() {
  return (
    <Text variant="small" tone="faint">
      •
    </Text>
  );
}

function Poll({ post, canVote }: { post: Post; canVote: boolean }) {
  const { colors } = useTheme();
  const vote = useVote(post);
  const results = post.poll_results ?? post.poll_options.map(() => 0);
  const total = results.reduce((sum, value) => sum + value, 0);
  const chosen = post.viewer?.vote ?? null;
  const leader = Math.max(...results);
  const showResults = chosen !== null || !canVote;

  return (
    <View style={{ gap: space.sm }}>
      {post.poll_options.map((option, index) => {
        const count = results[index] ?? 0;
        const percent = total ? Math.round((count / total) * 100) : 0;
        const selected = chosen === index;
        return (
          <Pressable
            key={index}
            disabled={!canVote || vote.isPending}
            onPress={() => vote.mutate(index)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card }]}
          >
            {showResults ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { width: `${percent}%`, backgroundColor: count === leader && count > 0 ? colors.primarySoft : colors.container },
                ]}
              />
            ) : null}
            {/* Dans une View : l'icône passe au-dessus de la barre de résultat. */}
            <View>
              <Icon name={selected ? 'check-circle' : 'circle'} size={18} tone={selected ? 'primary' : 'faint'} />
            </View>
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {option}
            </Text>
            {showResults ? (
              <Text variant="label" tone="muted">
                {percent} %
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      <Text variant="monoSm" tone="faint">
        {total} vote{total > 1 ? 's' : ''}
        {!canVote ? ' · connectez-vous pour voter' : chosen === null ? ' · votez pour voir les résultats' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Carte du web (rounded-xl, bordure fine, ombre légère) ; la marge latérale vient de la liste.
  card: {
    gap: 12,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 2, marginHorizontal: -6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 50,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
