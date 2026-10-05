import { questionSchema } from '@afridev/validation';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useAutosaveDraft } from '@/shared/drafts';
import { useDebounced } from '@/shared/hooks';
import { RequireAuth } from '@/shared/layout';
import { routeForWebPath } from '@/shared/navigation';
import { redactSecrets, useSecretScan } from '@/shared/security-guard';
import { radius, space, useTheme } from '@/shared/theme';
import {
  Button,
  DraftBadge,
  Icon,
  Pill,
  Screen,
  ScreenHeader,
  SecretAlert,
  TagInput,
  Text,
  TextField,
  useToast,
} from '@/shared/ui';

import { askQuestion, rephraseQuestion, useSimilarQuestions } from '../api';
import { VoiceButton } from '../components/VoiceButton';

interface Draft {
  title: string;
  body: string;
  tags: string[];
}

const EMPTY: Draft = { title: '', body: '', tags: [] };
const TAG_SUGGESTIONS = ['mobile-money', 'ussd', 'django', 'react-native', 'flutter', 'offline-first'];

export function AskQuestionScreen() {
  return (
    <RequireAuth title="Poser une question">
      <AskForm />
    </RequireAuth>
  );
}

function AskForm() {
  const { colors } = useTheme();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ title: string; body: string } | null>(null);
  const [rephrasing, setRephrasing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autosave = useAutosaveDraft<Draft>('question:new', draft, setDraft);
  const findings = useSecretScan(draft.title, draft.body);
  const locked = findings.length > 0;
  const similar = useSimilarQuestions(useDebounced(`${draft.title} ${draft.body}`.trim(), 800));
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function rephrase() {
    setError(null);
    setRephrasing(true);
    try {
      setSuggestion(await rephraseQuestion(draft.title, draft.body));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRephrasing(false);
    }
  }

  async function publish() {
    setError(null);
    const parsed = questionSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Question incomplète.');
      return;
    }
    setPublishing(true);
    try {
      const outcome = await askQuestion({ ...parsed.data, audio_media_id: audioId });
      autosave.clear();
      if (outcome.queued) {
        toast('Hors ligne : votre question partira au retour du réseau.', 'queued');
        router.back();
      } else {
        router.replace(`/question/${outcome.result.id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
      setPublishing(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<ScreenHeader title="Poser une question" back right={<DraftBadge savedAt={autosave.savedAt} />} />}
        footer={
          <Button
            label={locked ? 'Publication verrouillée' : 'Publier la question'}
            icon={locked ? 'lock' : undefined}
            iconRight={locked ? undefined : 'send'}
            size="lg"
            loading={publishing}
            disabled={locked}
            onPress={publish}
          />
        }
      >
        <TextField
          label="Titre de votre blocage"
          value={draft.title}
          onChangeText={(title) => update({ title })}
          maxLength={200}
          counter={`${draft.title.length} / 200`}
          placeholder="Ex. Comment sécuriser un webhook T-Money avec FastAPI ?"
          hint="Le problème, l'environnement et le service concerné."
        />

        <VoiceButton
          onTranscript={(text, mediaId) => {
            setAudioId(mediaId);
            setDraft((current) => ({ ...current, body: current.body ? `${current.body}\n\n${text}` : text }));
          }}
        />

        <TextField
          label="Détails"
          value={draft.body}
          onChangeText={(body) => update({ body })}
          multiline
          maxLength={10000}
          placeholder="Contexte, ce que vous avez essayé, message d’erreur. Le code va dans un bloc ```."
          error={locked ? 'Secret détecté : retirez-le avant de publier.' : null}
          style={{ minHeight: 180 }}
        />

        <Button
          label="Améliorer avec l’IA"
          icon="zap"
          variant="tool"
          loading={rephrasing}
          disabled={!draft.title.trim() || !draft.body.trim() || locked}
          onPress={rephrase}
        />

        {suggestion ? (
          <View style={[styles.suggestion, { backgroundColor: colors.tertiarySoft, borderColor: colors.tertiary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="sun" size={18} tone="tertiary" />
              <Text variant="bodyMedium" tone="tertiary" style={{ flex: 1 }}>
                Suggestion de reformulation
              </Text>
            </View>
            <View style={[styles.suggestionBody, { backgroundColor: colors.card }]}>
              <Text variant="bodyMedium">« {suggestion.title} »</Text>
              <Text variant="small" tone="muted" numberOfLines={5}>
                {suggestion.body}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Accepter"
                  icon="check"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    update({ title: suggestion.title, body: suggestion.body });
                    setSuggestion(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Refuser" variant="subtle" size="sm" onPress={() => setSuggestion(null)} />
              </View>
            </View>
          </View>
        ) : null}

        <SecretAlert findings={findings} onRedact={() => update({ title: redactSecrets(draft.title), body: redactSecrets(draft.body) })} />

        <View style={{ gap: space.sm }}>
          <Text variant="label">Tags techniques (5 max)</Text>
          <TagInput value={draft.tags} onChange={(tags) => update({ tags })} suggestions={TAG_SUGGESTIONS} />
        </View>

        <View style={[styles.similar, { backgroundColor: colors.container }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="headlineMd" style={{ flex: 1 }}>
              Déjà résolu ?
            </Text>
            {similar.isFetching ? <ActivityIndicator size="small" color={colors.inkFaint} /> : null}
          </View>
          {similar.data?.length ? (
            similar.data.map((hit) => (
              <Pressable
                key={hit.source_id}
                onPress={() => {
                  const route = routeForWebPath(hit.url);
                  if (route) router.push(route as never);
                }}
                accessibilityRole="link"
                style={[styles.hit, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text variant="small" style={{ flex: 1 }} numberOfLines={2}>
                  {hit.title}
                </Text>
                <Icon name="check-circle" size={16} tone="secondary" />
              </Pressable>
            ))
          ) : (
            <Text variant="monoSm" tone="faint">
              {draft.title.length < 15 ? 'Les questions similaires s’afficheront ici…' : 'Aucune question similaire trouvée.'}
            </Text>
          )}
        </View>

        <Pill tone="primary" icon="zap" label="Première réponse de l’IA en quelques secondes" />
        {error ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  suggestion: { gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  suggestionBody: { gap: 4, padding: 12, borderRadius: radius.md },
  similar: { gap: space.sm, padding: space.md, borderRadius: radius.lg },
  hit: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 12, borderRadius: radius.md, borderWidth: 1, minHeight: 48 },
});
