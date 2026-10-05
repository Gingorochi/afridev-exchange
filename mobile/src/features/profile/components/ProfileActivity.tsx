import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PostCard, useFeed } from '@/features/feed';
import { ProjectCard, useProjects } from '@/features/projects';
import { QuestionCard, useQuestions } from '@/features/qa';
import { useSnippetsByAuthor } from '@/features/snippets';
import { radius, space, useTheme } from '@/shared/theme';
import { Button, CardSkeleton, CodeBlock, EmptyState, Pill, Segmented, Text, timeAgo } from '@/shared/ui';

type Tab = 'snippets' | 'posts' | 'questions' | 'projects';

/** Activité publique d'un membre, par onglets. */
export function ProfileActivity({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('snippets');
  return (
    <View style={{ gap: space.md }}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'snippets', label: 'Snippets' },
          { value: 'posts', label: 'Posts' },
          { value: 'questions', label: 'Q&R' },
          { value: 'projects', label: 'Projets' },
        ]}
      />
      {tab === 'snippets' ? <Snippets authorId={userId} /> : null}
      {tab === 'posts' ? <Posts authorId={userId} /> : null}
      {tab === 'questions' ? <Questions authorId={userId} /> : null}
      {tab === 'projects' ? <Projects ownerId={userId} /> : null}
    </View>
  );
}

function List<T>({
  query,
  render,
  empty,
}: {
  query: { items: T[]; isPending: boolean; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
  render: (item: T) => React.ReactNode;
  empty: string;
}) {
  if (query.isPending) return <CardSkeleton lines={2} />;
  if (!query.items.length) return <EmptyState title={empty} />;
  return (
    <View style={{ gap: space.md }}>
      {query.items.map(render)}
      {query.hasNextPage ? <Button label="Charger plus" variant="ghost" size="sm" loading={query.isFetchingNextPage} onPress={() => query.fetchNextPage()} /> : null}
    </View>
  );
}

function Snippets({ authorId }: { authorId: string }) {
  const { colors } = useTheme();
  const snippets = useSnippetsByAuthor(authorId);
  return (
    <List
      query={snippets}
      empty="Aucun snippet public"
      render={(snippet) => (
        <Pressable
          key={snippet.id}
          onPress={() => router.push(`/snippet/${snippet.id}`)}
          accessibilityRole="button"
          style={[styles.snippet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pill label={snippet.language} />
            <View style={{ flex: 1 }} />
            <Text variant="monoSm" tone="faint">
              {timeAgo(snippet.published_at)}
            </Text>
          </View>
          <Text variant="headlineMd">{snippet.title}</Text>
          <CodeBlock code={snippet.content} language={snippet.language} maxLines={6} />
        </Pressable>
      )}
    />
  );
}

function Posts({ authorId }: { authorId: string }) {
  const posts = useFeed({ author: authorId });
  return <List query={posts} empty="Aucun post" render={(post) => <PostCard key={post.id} post={post} />} />;
}

function Questions({ authorId }: { authorId: string }) {
  const questions = useQuestions({ author: authorId });
  return <List query={questions} empty="Aucune question" render={(question) => <QuestionCard key={question.id} question={question} />} />;
}

function Projects({ ownerId }: { ownerId: string }) {
  const projects = useProjects({ owner: ownerId });
  return <List query={projects} empty="Aucun projet" render={(project) => <ProjectCard key={project.id} project={project} />} />;
}

const styles = StyleSheet.create({
  snippet: { gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
});
