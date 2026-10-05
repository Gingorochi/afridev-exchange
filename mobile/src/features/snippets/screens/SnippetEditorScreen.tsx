import { snippetSchema } from '@afridev/validation';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useAutosaveDraft } from '@/shared/drafts';
import { RequireAuth } from '@/shared/layout';
import { redactSecrets, useSecretScan } from '@/shared/security-guard';
import { radius, space, useTheme } from '@/shared/theme';
import {
  Button,
  CardSkeleton,
  CodeEditor,
  DraftBadge,
  ErrorNotice,
  FilterChips,
  formatBytes,
  Icon,
  Pill,
  Screen,
  ScreenHeader,
  SecretAlert,
  SwitchRow,
  TagInput,
  Text,
  TextField,
  useToast,
  utf8Size,
} from '@/shared/ui';

import { LANGUAGES, type SnippetInput, useSaveSnippet, useSnippet } from '../api';

const EMPTY: SnippetInput = { title: '', language: 'python', content: '', tags: [], is_public: false };

/** Création (paramètre `id` absent) et modification d'un snippet. */
export function SnippetEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <RequireAuth title="Snippet">
      <EditorLoader id={id || undefined} />
    </RequireAuth>
  );
}

function EditorLoader({ id }: { id?: string }) {
  const existing = useSnippet(id);
  if (id && !existing.data) {
    return (
      <Screen header={<ScreenHeader title="Modifier le snippet" back />}>
        {existing.isError ? <ErrorNotice title="Snippet introuvable." /> : <CardSkeleton lines={8} />}
      </Screen>
    );
  }
  return <Editor id={id} initial={existing.data ?? undefined} />;
}

function Editor({ id, initial }: { id?: string; initial?: SnippetInput }) {
  const { colors } = useTheme();
  const toast = useToast();
  const save = useSaveSnippet();
  const [form, setForm] = useState<SnippetInput>(
    initial
      ? { title: initial.title, language: initial.language, content: initial.content, tags: initial.tags, is_public: initial.is_public }
      : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  // Brouillon automatique seulement pour un nouveau snippet (la version serveur fait foi sinon).
  const autosave = useAutosaveDraft<SnippetInput>(id ? `snippet:${id}` : 'snippet:new', form, id ? undefined : setForm);
  const findings = useSecretScan(form.content, form.title);
  const locked = findings.length > 0;
  const update = (patch: Partial<SnippetInput>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    setError(null);
    const parsed = snippetSchema.safeParse({
      title: form.title,
      language: form.language,
      content: form.content,
      tags: form.tags,
      isPublic: form.is_public,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Snippet invalide.');
      return;
    }
    try {
      const outcome = await save.mutateAsync({ id, input: form });
      autosave.clear();
      toast(outcome.queued ? 'Hors ligne : enregistré, envoi au retour du réseau.' : 'Snippet enregistré dans votre coffre.', outcome.queued ? 'queued' : 'success');
      if (outcome.queued) router.back();
      else router.replace(`/snippet/${outcome.result.id}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<ScreenHeader title={id ? 'Modifier le snippet' : 'Nouveau snippet'} back right={<DraftBadge savedAt={autosave.savedAt} />} />}
        footer={
          <Button
            label={locked ? 'Enregistrement verrouillé' : 'Sauvegarder dans mon coffre'}
            icon={locked ? 'lock' : 'save'}
            size="lg"
            loading={save.isPending}
            disabled={locked}
            onPress={submit}
          />
        }
      >
        <TextField
          label="Titre"
          value={form.title}
          onChangeText={(title) => update({ title })}
          maxLength={120}
          counter={`${form.title.length} / 120`}
          placeholder="Ex. Vérification de signature webhook Wave"
        />
        <View style={{ gap: space.sm }}>
          <Text variant="label">Langage</Text>
          <FilterChips
            value={form.language}
            onChange={(language) => update({ language })}
            options={LANGUAGES.map((language) => ({ value: language, label: language }))}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="label">Code</Text>
            <Text variant="monoSm" tone="faint">
              {formatBytes(utf8Size(form.content))}
            </Text>
          </View>
          <CodeEditor
            value={form.content}
            onChange={(content) => update({ content })}
            flaggedLines={findings.map((finding) => finding.line)}
            placeholder="# Collez votre code ici"
          />
        </View>

        {locked ? (
          <SecretAlert findings={findings} onRedact={() => update({ content: redactSecrets(form.content), title: redactSecrets(form.title) })} />
        ) : (
          <View style={[styles.guard, { backgroundColor: colors.secondaryMint }]}>
            <View style={[styles.guardIcon, { backgroundColor: colors.secondary }]}>
              <Icon name="shield" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text variant="bodyMedium" tone="secondary" style={{ flex: 1 }}>
                  Security Guard
                </Text>
                <Pill tone="success" dot label="Actif" />
              </View>
              <Text variant="small" tone="secondary">
                Aucune clé secrète (MTN MoMo, Wave, Stripe, Groq…) ni jeton détecté.
              </Text>
            </View>
          </View>
        )}

        <View style={{ gap: space.sm }}>
          <Text variant="label">Tags (8 max)</Text>
          <TagInput value={form.tags} max={8} onChange={(tags) => update({ tags })} suggestions={['wave', 'orange-money', 'ussd', 'docker', 'postgresql']} />
        </View>

        {!id ? (
          <View style={[styles.public, { backgroundColor: colors.container }]}>
            <SwitchRow
              title="Rendre ce snippet public"
              description="Visible par la communauté et ajouté à la base de connaissances de l'IA. Une seconde analyse (IA) le repasse en privé s'il expose une donnée sensible."
              value={form.is_public}
              onChange={(is_public) => update({ is_public })}
            />
          </View>
        ) : null}

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
  guard: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.lg },
  guardIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  public: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg },
});
