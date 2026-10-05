import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { PUBLIC_WEB_URL } from '@/shared/api';
import { useSession } from '@/shared/session';
import { radius, space, useTheme } from '@/shared/theme';
import {
  Avatar,
  Button,
  Card,
  CardSkeleton,
  CodeBlock,
  copyText,
  ErrorNotice,
  formatBytes,
  Icon,
  IconButton,
  Pill,
  Screen,
  ScreenHeader,
  SectionTitle,
  Tag,
  Text,
  timeAgo,
  useToast,
  utf8Size,
} from '@/shared/ui';

import { type PublicSnippet, reviewOf, usePublicSnippet, useSnippet, useSnippetsByAuthor, useVersions } from '../api';

interface ViewModel {
  id: string;
  title: string;
  language: string;
  content: string;
  tags: string[];
  date: string | null;
  isPublic: boolean;
  author: PublicSnippet['author'];
  reasons: string[];
}

export function SnippetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, profile } = useSession();
  const toast = useToast();
  const publicSnippet = usePublicSnippet(id);
  // Pas de version publique : c'est peut-être un snippet privé de mon coffre.
  const own = useSnippet(publicSnippet.isError && isAuthenticated ? id : undefined);

  let view: ViewModel | null = null;
  if (publicSnippet.data) {
    const s = publicSnippet.data;
    view = { id: s.id, title: s.title, language: s.language, content: s.content, tags: s.tags, date: s.published_at, isPublic: true, author: s.author, reasons: [] };
  } else if (own.data) {
    const s = own.data;
    view = {
      id: s.id,
      title: s.title,
      language: s.language,
      content: s.content,
      tags: s.tags,
      date: s.updated_at,
      isPublic: s.is_public,
      reasons: reviewOf(s).risky ? reviewOf(s).reasons : [],
      author: profile
        ? { id: profile.id, username: profile.username, display_name: profile.display_name || profile.username, avatar_url: profile.avatar_url }
        : null,
    };
  }

  const mine = Boolean(view && profile && view.author?.id === profile.id);
  const size = view ? formatBytes(utf8Size(view.content)) : '';

  return (
    <Screen
      header={
        <ScreenHeader
          title="Snippet"
          back
          right={
            view?.isPublic ? (
              <IconButton
                icon="share-2"
                label="Partager"
                onPress={() => void Share.share({ message: `${view.title}\n${PUBLIC_WEB_URL}/snippets/${view.id}` }).catch(() => undefined)}
              />
            ) : null
          }
        />
      }
      footer={
        view ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label={`Copier (${size})`}
                icon="copy"
                size="lg"
                onPress={() => void copyText(view.content).then(() => toast('Code copié dans le presse-papiers.'))}
              />
            </View>
            {mine ? (
              <Button label="Modifier" icon="edit-2" variant="ghost" size="lg" onPress={() => router.push({ pathname: '/snippet/edit', params: { id: view.id } })} />
            ) : null}
          </View>
        ) : null
      }
    >
      {!view ? (
        publicSnippet.isPending || own.isFetching ? (
          <CardSkeleton lines={8} />
        ) : (
          <ErrorNotice title="Snippet introuvable." message="Il est privé, a été supprimé, ou n'est pas encore sur ce téléphone." />
        )
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill label={view.language} />
            {view.isPublic ? <Pill tone="mint" icon="globe" label="Public" /> : <Pill icon="lock" label="Privé" />}
            <Pill tone="success" icon="wifi-off" label="Lisible hors ligne" />
          </View>
          <Text variant="headlineXl">{view.title}</Text>
          {view.author ? (
            <Pressable
              onPress={() => view.author && router.push(`/u/${view.author.username}`)}
              accessibilityRole="link"
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
            >
              <Avatar name={view.author.display_name} uri={view.author.avatar_url} size={36} />
              <View>
                <Text variant="bodyMedium">{view.author.display_name}</Text>
                <Text variant="monoSm" tone="muted">
                  @{view.author.username}
                  {view.date ? ` · ${view.isPublic ? 'publié' : 'modifié'} ${timeAgo(view.date)}` : ''}
                </Text>
              </View>
            </Pressable>
          ) : null}
          {view.reasons.length ? <ReviewAlert reasons={view.reasons} /> : null}
          <CodeBlock
            code={view.content}
            language={view.language}
            filename={`${view.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}.${view.language}`}
          />
          <Text variant="monoSm" tone="muted">
            {view.content.split('\n').length} lignes · {size}
          </Text>
          {view.tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {view.tags.map((tag) => (
                <Tag key={tag} label={tag} onPress={() => router.push({ pathname: '/search', params: { q: tag } })} />
              ))}
            </View>
          ) : null}
          {mine ? <Versions id={view.id} /> : null}
          {view.author && view.isPublic ? <MoreFromAuthor authorId={view.author.id} currentId={view.id} /> : null}
        </>
      )}
    </Screen>
  );
}

function ReviewAlert({ reasons }: { reasons: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.alert, { backgroundColor: colors.tertiarySoft, borderColor: colors.tertiary }]} accessibilityRole="alert">
      <Icon name="alert-triangle" size={20} tone="tertiary" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" tone="tertiary">
          Repassé en privé par le Security Guard
        </Text>
        <Text variant="small" tone="tertiary">
          {reasons.join(' ')} Corrigez-le puis republiez.
        </Text>
      </View>
    </View>
  );
}

function Versions({ id }: { id: string }) {
  const { colors } = useTheme();
  const versions = useVersions(id, true);
  if (!versions.data?.length) return null;
  return (
    <Card style={{ gap: space.sm }}>
      <SectionTitle title="Historique des versions" />
      {versions.data.map((version, index) => (
        <View
          key={version.number}
          style={[styles.version, index === 0 && { backgroundColor: colors.secondaryMint, borderLeftColor: colors.secondary }]}
        >
          <Text variant="mono" tone={index === 0 ? 'secondary' : 'ink'}>
            v{version.number}
            {index === 0 ? ' (actuelle)' : ''}
          </Text>
          <Text variant="monoSm" tone="faint">
            {timeAgo(version.created_at)}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function MoreFromAuthor({ authorId, currentId }: { authorId: string; currentId: string }) {
  const { colors } = useTheme();
  const snippets = useSnippetsByAuthor(authorId);
  const others = snippets.items.filter((snippet) => snippet.id !== currentId).slice(0, 3);
  if (!others.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title="Du même auteur" />
      {others.map((snippet) => (
        <Pressable
          key={snippet.id}
          onPress={() => router.push(`/snippet/${snippet.id}`)}
          accessibilityRole="link"
          style={[styles.other, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text variant="monoSm" tone="muted">
            {snippet.language}
          </Text>
          <Text variant="bodyMedium">{snippet.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  version: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  other: { gap: 2, padding: 12, borderRadius: radius.md, borderWidth: 1 },
});
