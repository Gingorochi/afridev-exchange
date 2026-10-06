import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { TranslateButton } from '@/features/translation';
import { useOutbox } from '@/shared/offline';
import { useLiveSocket } from '@/shared/realtime/useLiveSocket';
import { useSession } from '@/shared/session';
import { radius, space, useTheme } from '@/shared/theme';
import { Avatar, Button, Icon, Markdown, PillAction, Skeleton, Text, timeAgo } from '@/shared/ui';

import { type Comment, deleteComment, discussionKeys, useComments, useThreadSummary } from '../api';

/** Résumé IA (dès 5 commentaires), commentaires en direct et envois en attente. */
export function CommentThread({
  postId,
  commentCount,
  authorId,
  onReply,
}: {
  postId: string;
  commentCount: number;
  authorId?: string;
  onReply?: (comment: Comment) => void;
}) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useSession();
  const comments = useComments(postId);
  const pending = useOutbox('comments').filter((entry) => entry.data.post_id === postId);

  useLiveSocket(isAuthenticated ? `/ws/discussions/${postId}/` : null, () => {
    void queryClient.invalidateQueries({ queryKey: discussionKeys.comments(postId) });
    void queryClient.invalidateQueries({ queryKey: discussionKeys.summary(postId) });
  });

  const byParent = new Map<string | null, Comment[]>();
  for (const comment of comments.items) {
    const key = comment.parent_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), comment]);
  }

  return (
    <View style={{ gap: space.md }} accessibilityLabel="Commentaires">
      <ThreadSummary postId={postId} commentCount={commentCount} />
      {comments.isPending ? (
        <>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </>
      ) : !comments.items.length && !pending.length ? (
        <Text tone="muted" center>
          Aucun commentaire pour l’instant. Lancez la discussion !
        </Text>
      ) : (
        (byParent.get(null) ?? []).map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            mine={comment.author?.id === user?.id}
            isAuthor={comment.author?.id === authorId}
            onReply={onReply}
          >
            {(byParent.get(comment.id) ?? []).map((reply) => (
              <CommentItem key={reply.id} comment={reply} postId={postId} mine={reply.author?.id === user?.id} isAuthor={reply.author?.id === authorId} />
            ))}
          </CommentItem>
        ))
      )}
      {pending.map((entry) => (
        <PendingComment key={entry.id} body={String(entry.data.body)} />
      ))}
      {comments.hasNextPage ? (
        <Button label="Voir plus de commentaires" variant="ghost" size="sm" onPress={() => comments.fetchNextPage()} loading={comments.isFetchingNextPage} />
      ) : null}
    </View>
  );
}

function ThreadSummary({ postId, commentCount }: { postId: string; commentCount: number }) {
  const { colors } = useTheme();
  const summary = useThreadSummary(postId, commentCount >= 5);
  if (!summary.data?.points.length) return null;
  return (
    <View style={[styles.summary, { backgroundColor: colors.secondaryMint, borderColor: colors.secondarySoft }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.secondary }]}>
          <Icon name="zap" size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMd" tone="secondary">
            Synthèse IA
          </Text>
          <Text variant="monoSm" tone="secondary">
            {summary.data.comment_count} commentaires résumés en 3 points
          </Text>
        </View>
      </View>
      {summary.data.points.map((point, index) => (
        <View key={index} style={[styles.point, { backgroundColor: colors.card }]}>
          <Text variant="mono" tone="primary">
            {String(index + 1).padStart(2, '0')}
          </Text>
          <Text style={{ flex: 1 }}>{point}</Text>
        </View>
      ))}
    </View>
  );
}

function CommentItem({
  comment,
  postId,
  mine,
  isAuthor,
  onReply,
  children,
}: {
  comment: Comment;
  postId: string;
  mine: boolean;
  isAuthor: boolean;
  onReply?: (comment: Comment) => void;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const name = comment.author?.display_name || comment.author?.username || 'Membre';
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        onPress={() => comment.author && router.push(`/u/${comment.author.username}`)}
        accessibilityRole="link"
        accessibilityLabel={name}
        style={styles.head}
      >
        <Avatar name={name} uri={comment.author?.avatar_url} size={28} />
        <Text variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
          {name}
        </Text>
        {isAuthor ? (
          <View style={[styles.op, { backgroundColor: colors.primarySoft }]}>
            <Text variant="monoSm" tone="primary">
              Auteur
            </Text>
          </View>
        ) : null}
        <Text variant="monoSm" tone="faint">
          · {timeAgo(comment.created_at)}
        </Text>
      </Pressable>
      {/* Ligne de fil : le corps et les réponses s'alignent sous l'avatar, façon Reddit. */}
      <View style={[styles.body, { borderLeftColor: colors.border }]}>
        <Markdown source={comment.body} />
        <View style={styles.actions}>
          {onReply ? <PillAction icon="corner-up-left" label="Répondre" a11y="Répondre" onPress={() => onReply(comment)} /> : null}
          <TranslateButton text={comment.body} />
          {mine ? (
            <PillAction
              icon="trash-2"
              a11y="Supprimer"
              onPress={async () => {
                await deleteComment(comment.id);
                void queryClient.invalidateQueries({ queryKey: discussionKeys.comments(postId) });
              }}
            />
          ) : null}
        </View>
        {children ? <View style={{ gap: space.sm, marginTop: 4 }}>{children}</View> : null}
      </View>
    </View>
  );
}

function PendingComment({ body }: { body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.comment, { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.tertiary, backgroundColor: colors.tertiarySoft }]}>
      <Icon name="clock" size={18} tone="tertiary" />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="monoSm" tone="tertiary">
          En attente de réseau
        </Text>
        <Text>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  summaryIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', gap: space.sm, padding: 12, borderRadius: radius.md },
  comment: { flexDirection: 'row', gap: space.sm, padding: 12, borderRadius: radius.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  op: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  body: { marginLeft: 13, paddingLeft: 21, borderLeftWidth: 1.5, gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2, marginLeft: -10 },
});
