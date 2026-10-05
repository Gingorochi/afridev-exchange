import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { type Comment, CommentComposer, CommentThread } from '@/features/discussions';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import { CardSkeleton, ErrorNotice, Screen, ScreenHeader, Text } from '@/shared/ui';

import { usePost } from '../api';
import { PostCard } from '../components/PostCard';

export function PostDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<ScreenHeader title="Discussion" back />}
        refreshing={post.isRefetching}
        onRefresh={() => void post.refetch()}
        contentContainerStyle={styles.content}
        footer={post.data ? <CommentComposer postId={post.data.id} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} /> : null}
      >
        {post.isPending ? (
          <View>
            <CardSkeleton lines={5} />
          </View>
        ) : !post.data ? (
          <View>
            <ErrorNotice title="Post introuvable." message="Il a peut-être été supprimé, ou n'est pas encore sur ce téléphone." />
          </View>
        ) : (
          <>
            <PostCard post={post.data} detail />
            {/* Fil de commentaires d'un seul tenant, comme sur Reddit mobile. */}
            <View style={[styles.comments, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text variant="headlineMd">
                {post.data.comment_count} commentaire{post.data.comment_count > 1 ? 's' : ''}
              </Text>
              <CommentThread
                postId={post.data.id}
                commentCount={post.data.comment_count}
                authorId={post.data.author?.id}
                onReply={setReplyTo}
              />
            </View>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Cartes séparées de 12 px, comme la page web sur téléphone.
  content: { gap: 12, padding: 12, paddingBottom: 48 },
  comments: { gap: space.md, padding: space.md, borderRadius: radius.xl, borderWidth: 1 },
});
