import { answerSchema } from '@afridev/validation';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ReportButton } from '@/features/moderation';
import { TranslateButton } from '@/features/translation';
import { errorMessage } from '@/shared/api';
import { useAutosaveDraft } from '@/shared/drafts';
import { routeForWebPath } from '@/shared/navigation';
import { useOutbox } from '@/shared/offline';
import { useSecretScan } from '@/shared/security-guard';
import { useSession } from '@/shared/session';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  Avatar,
  Button,
  Card,
  CardSkeleton,
  CommunityIcon,
  DraftBadge,
  ErrorNotice,
  Icon,
  IconButton,
  Markdown,
  Pill,
  Screen,
  ScreenHeader,
  SecretAlert,
  Segmented,
  Sheet,
  Skeleton,
  Tag,
  Text,
  TextField,
  timeAgo,
  useToast,
} from '@/shared/ui';

import {
  type Answer,
  type Question,
  useAnswerActions,
  useAnswers,
  useCreateAnswer,
  useDeleteQuestion,
  useQuestion,
  useRegenerateAiAnswer,
} from '../api';

export function QuestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const question = useQuestion(id);
  const [answering, setAnswering] = useState(false);
  const { isAuthenticated } = useSession();

  return (
    <Screen
      header={<ScreenHeader title="Question" back right={question.data ? <ReportOrDelete question={question.data} /> : null} />}
      refreshing={question.isRefetching}
      onRefresh={() => void question.refetch()}
      footer={
        question.data ? (
          <Button
            label={isAuthenticated ? 'Proposer une réponse' : 'Se connecter pour répondre'}
            icon={isAuthenticated ? 'edit-3' : 'log-in'}
            size="lg"
            onPress={() => (isAuthenticated ? setAnswering(true) : router.push('/login'))}
          />
        ) : null
      }
    >
      {question.data ? (
        <>
          <QuestionBody question={question.data} />
          <AiAnswer question={question.data} />
          <CommunityAnswers question={question.data} />
          <AnswerSheet questionId={question.data.id} open={answering} onClose={() => setAnswering(false)} />
        </>
      ) : question.isPending ? (
        <CardSkeleton lines={6} />
      ) : (
        <ErrorNotice title="Question introuvable." message="Elle a peut-être été supprimée, ou n'est pas encore sur ce téléphone." />
      )}
    </Screen>
  );
}

function ReportOrDelete({ question }: { question: Question }) {
  const { user } = useSession();
  const remove = useDeleteQuestion();
  if (user && question.author?.id === user.id) {
    return (
      <IconButton
        icon="trash-2"
        label="Supprimer la question"
        tone="muted"
        onPress={() =>
          Alert.alert('Supprimer cette question ?', 'Les réponses seront aussi supprimées.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(question.id, { onSuccess: () => router.back() }) },
          ])
        }
      />
    );
  }
  return <ReportButton targetType="question" targetId={question.id} />;
}

function QuestionBody({ question }: { question: Question }) {
  const { colors } = useTheme();
  const name = question.author?.display_name || question.author?.username || 'Membre';
  const [community] = question.tags;
  return (
    // Carte, comme une publication ouverte sur le web.
    <View style={[styles.question, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        onPress={() => question.author && router.push(`/u/${question.author.username}`)}
        accessibilityRole="link"
      >
        {community ? <CommunityIcon tag={community} size={36} /> : <Avatar name={name} uri={question.author?.avatar_url} size={36} />}
        <View style={{ flex: 1 }}>
          {community ? <Text variant="label">d/{community}</Text> : null}
          <Text variant="monoSm" tone="muted" numberOfLines={1}>
            {name} · {timeAgo(question.created_at)}
          </Text>
        </View>
        {question.is_resolved ? <Pill tone="success" icon="check-circle" label="Résolue" /> : null}
      </Pressable>
      <Text variant="headlineLg">{question.title}</Text>
      <Markdown source={question.body} />
      {question.tags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {question.tags.map((tag) => (
            <Tag key={tag} label={tag} onPress={() => router.push({ pathname: '/questions', params: { tag } })} />
          ))}
        </View>
      ) : null}
      <TranslateButton text={`${question.title}\n\n${question.body}`} />
    </View>
  );
}

function AiAnswer({ question }: { question: Question }) {
  const { colors } = useTheme();
  const { user } = useSession();
  const regenerate = useRegenerateAiAnswer(question.id);
  const status = question.ai_answer_status;
  const sources = question.ai_answer_sources;
  const mine = Boolean(user && question.author?.id === user.id);
  const openSource = (n: number) => {
    const source = sources[n - 1];
    const route = source ? routeForWebPath(source.url) : null;
    if (route) router.push(route as never);
  };

  return (
    <View style={[styles.ai, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
      <View style={[styles.aiHeader, { backgroundColor: colors.secondaryMint }]}>
        <Icon name="zap" size={18} tone="secondary" />
        <Text variant="headlineMd" tone="secondary" style={{ flex: 1 }}>
          Première réponse de l’IA
        </Text>
        <Pill
          tone={status === 'ready' ? 'success' : status === 'pending' ? 'warning' : 'neutral'}
          label={{ ready: 'Générée', pending: 'En cours', failed: 'Échec', disabled: 'Indisponible' }[status]}
        />
      </View>
      <View style={{ padding: space.md, gap: space.md }}>
        <Text variant="monoSm" tone="muted">
          En attendant la communauté. Vérifiez toujours avant de mettre en production.
        </Text>
        {status === 'pending' ? (
          <View style={{ gap: 8 }} accessibilityLabel="L’IA rédige une réponse">
            <Skeleton height={12} />
            <Skeleton height={12} width="90%" />
            <Skeleton height={12} width="70%" />
          </View>
        ) : status === 'ready' && question.ai_answer ? (
          <Markdown source={question.ai_answer} onCite={openSource} />
        ) : (
          <Text tone="muted">
            {status === 'disabled' ? 'L’assistant IA n’est pas activé sur ce serveur.' : 'L’IA n’a pas pu répondre cette fois-ci.'}
          </Text>
        )}
        {status === 'ready' && sources.length ? (
          <View style={{ gap: 6 }}>
            <Text variant="label">Sources vérifiées</Text>
            {sources.map((source, index) => (
              <Pressable key={source.source_id} onPress={() => openSource(index + 1)} accessibilityRole="link" style={styles.source}>
                <Text variant="mono" tone="primary">
                  [{index + 1}]
                </Text>
                <Text variant="small" style={{ flex: 1 }} numberOfLines={2}>
                  {source.title}
                </Text>
                <Icon name="chevron-right" size={16} tone="faint" />
              </Pressable>
            ))}
          </View>
        ) : null}
        {mine && (status === 'failed' || status === 'ready') ? (
          <Button label="Régénérer la réponse" icon="refresh-cw" variant="ghost" size="sm" loading={regenerate.isPending} onPress={() => regenerate.mutate()} />
        ) : null}
      </View>
    </View>
  );
}

function CommunityAnswers({ question }: { question: Question }) {
  const { user } = useSession();
  const answers = useAnswers(question.id);
  const [sort, setSort] = useState<'votes' | 'recent'>('votes');
  const pending = useOutbox('answers').filter((entry) => entry.data.question_id === question.id);
  const mine = Boolean(user && question.author?.id === user.id);
  const sorted = [...(answers.data ?? [])].sort((a, b) =>
    sort === 'recent'
      ? b.created_at.localeCompare(a.created_at)
      : Number(b.is_accepted) - Number(a.is_accepted) || b.score - a.score,
  );

  return (
    <View style={{ gap: space.md }}>
      <Text variant="headlineLg">
        Réponses{' '}
        <Text variant="headlineLg" tone="faint">
          {answers.data?.length ?? question.answer_count}
        </Text>
      </Text>
      <Segmented
        value={sort}
        onChange={setSort}
        options={[
          { value: 'votes', label: 'Les plus votées' },
          { value: 'recent', label: 'Les plus récentes' },
        ]}
      />
      {answers.isPending ? <CardSkeleton /> : null}
      {sorted.map((answer) => (
        <AnswerCard key={answer.id} answer={answer} questionId={question.id} canAccept={mine} />
      ))}
      {pending.map((entry) => (
        <Card key={entry.id} style={{ gap: space.sm, borderStyle: 'dashed' }}>
          <Pill tone="warning" icon="clock" label="En attente de réseau" />
          <Text>{String(entry.data.body)}</Text>
        </Card>
      ))}
      {!answers.isPending && !sorted.length && !pending.length ? (
        <Text tone="muted" center>
          Pas encore de réponse de la communauté. Vous connaissez la solution ?
        </Text>
      ) : null}
    </View>
  );
}

function AnswerCard({ answer, questionId, canAccept }: { answer: Answer; questionId: string; canAccept: boolean }) {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useSession();
  const { accept, vote, remove } = useAnswerActions(questionId);
  const mine = Boolean(user && answer.author?.id === user.id);
  const name = answer.author?.display_name || answer.author?.username || 'Membre';

  return (
    <Card style={[{ gap: space.sm }, answer.is_accepted && { borderLeftWidth: 4, borderLeftColor: colors.secondary }]}>
      {answer.is_accepted ? <Pill tone="success" icon="check-circle" label="Solution acceptée par l’auteur" /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Avatar name={name} uri={answer.author?.avatar_url} size={36} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">{name}</Text>
          <Text variant="monoSm" tone="faint">
            {timeAgo(answer.created_at)}
          </Text>
        </View>
      </View>
      <Markdown source={answer.body} />
      <View style={styles.answerActions}>
        <View style={[styles.votes, { backgroundColor: colors.container }]}>
          <IconButton icon="arrow-up" label="Voter pour" onPress={isAuthenticated && !mine ? () => vote.mutate({ answerId: answer.id, value: 1 }) : undefined} />
          <Text variant="label">{answer.score > 0 ? `+${answer.score}` : answer.score}</Text>
          <IconButton icon="arrow-down" label="Voter contre" onPress={isAuthenticated && !mine ? () => vote.mutate({ answerId: answer.id, value: -1 }) : undefined} />
        </View>
        <TranslateButton text={answer.body} />
        <View style={{ flex: 1 }} />
        {mine ? (
          <IconButton
            icon="trash-2"
            label="Supprimer ma réponse"
            tone="muted"
            onPress={() =>
              Alert.alert('Supprimer votre réponse ?', undefined, [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(answer.id) },
              ])
            }
          />
        ) : (
          <ReportButton targetType="answer" targetId={answer.id} />
        )}
      </View>
      {canAccept && !answer.is_accepted ? (
        <Button label="Accepter cette réponse" icon="check-circle" variant="secondary" size="sm" loading={accept.isPending} onPress={() => accept.mutate(answer.id)} />
      ) : null}
    </Card>
  );
}

function AnswerSheet({ questionId, open, onClose }: { questionId: string; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateAnswer(questionId);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const autosave = useAutosaveDraft(`answer:${questionId}`, body, setBody);
  const findings = useSecretScan(body);

  async function submit() {
    setError(null);
    const parsed = answerSchema.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Réponse invalide.');
      return;
    }
    try {
      const outcome = await create.mutateAsync(parsed.data.body);
      setBody('');
      autosave.clear();
      onClose();
      toast(outcome.queued ? 'Hors ligne : réponse envoyée au retour du réseau.' : 'Réponse publiée.', outcome.queued ? 'queued' : 'success');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Votre réponse"
      subtitle="Markdown et blocs ``` acceptés"
      tall
      footer={
        <Button label="Publier ma réponse" iconRight="send" size="lg" loading={create.isPending} disabled={!body.trim() || findings.length > 0} onPress={submit} />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: space.md }}>
        <DraftBadge savedAt={autosave.savedAt} />
        <TextField
          value={body}
          onChangeText={setBody}
          multiline
          autoFocus
          maxLength={10000}
          placeholder="Expliquez la solution, avec un exemple de code si possible."
          accessibilityLabel="Votre réponse"
          style={{ minHeight: 200 }}
        />
        <SecretAlert findings={findings} />
        {error ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  question: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...cardShadow,
  },
  ai: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 12 },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  answerActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  votes: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full },
});
