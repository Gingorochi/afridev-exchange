'use client';

import { questionSchema } from '@afridev/validation';
import { CheckCircle2, Lightbulb, Lock, Save, Send, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '@/shared/api';
import { DraftStatus, useAutosaveDraft } from '@/shared/drafts';
import { useDebounced } from '@/shared/hooks';
import { PageHeader } from '@/shared/layout';
import { redactSecrets, SecretAlert, useSecretScan } from '@/shared/security-guard';
import { Button, Card, Field, Input, MarkdownEditor, Spinner, StatusBadge, TagInput, useToast } from '@/shared/ui';

import { askQuestion, rephraseQuestion, useSimilarQuestions } from '../api';
import { VoiceButton } from './VoiceButton';

interface Draft {
  title: string;
  body: string;
  tags: string[];
}

const EMPTY: Draft = { title: '', body: '', tags: [] };
const TAG_SUGGESTIONS = ['mobile-money', 'ussd', 'django', 'react-native', 'flutter', 'offline-first'];

export function AskQuestionScreen() {
  const router = useRouter();
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
      await autosave.clear();
      if (outcome.queued) {
        toast('Hors ligne : votre question partira au retour du réseau.', 'queued');
        router.push('/questions');
      } else {
        router.push(`/questions/${outcome.result.id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
      setPublishing(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Link href="/questions" className="hover:underline">Entraide & IA</Link> / Poser une question
          </>
        }
        title="Poser une question technique"
        actions={<DraftStatus savedAt={autosave.savedAt} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="space-y-6 p-4 sm:p-6">
          <Field
            label="Titre clair et précis de votre blocage"
            required
            hint="Résumez le problème, l'environnement et le service concerné."
            counter={`${draft.title.length} / 200`}
            htmlFor="title"
          >
            <Input
              id="title"
              value={draft.title}
              maxLength={200}
              placeholder="Ex. Comment sécuriser un webhook T-Money avec FastAPI ?"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>

          <div className="flex flex-wrap items-start gap-3 rounded-lg bg-container-low p-3">
            <VoiceButton
              onTranscript={(text, mediaId) => {
                setAudioId(mediaId);
                setDraft((current) => ({ ...current, body: current.body ? `${current.body}\n\n${text}` : text }));
              }}
            />
            <Button onClick={rephrase} loading={rephrasing} disabled={!draft.title.trim() || !draft.body.trim() || locked}>
              <Sparkles className="size-4" aria-hidden /> Améliorer avec l&apos;IA
            </Button>
          </div>

          {suggestion ? (
            <div className="space-y-3 rounded-lg border border-tertiary/40 bg-tertiary-soft/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold text-on-tertiary-soft">
                  <Lightbulb className="size-4" aria-hidden /> Suggestion de reformulation
                </p>
                <StatusBadge tone="warning" dot={false}>Recommandé</StatusBadge>
              </div>
              <div className="space-y-1 rounded-lg border border-line bg-card p-3">
                <p className="font-semibold text-ink">« {suggestion.title} »</p>
                <p className="line-clamp-4 whitespace-pre-wrap text-body-sm text-ink-muted">{suggestion.body}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDraft({ ...draft, title: suggestion.title, body: suggestion.body });
                    setSuggestion(null);
                  }}
                >
                  <CheckCircle2 className="size-4" aria-hidden /> Accepter la reformulation
                </Button>
                <Button variant="subtle" size="sm" onClick={() => setSuggestion(null)}>
                  Refuser
                </Button>
              </div>
            </div>
          ) : null}

          <Field label="Détails" required hint="Contexte, ce que vous avez essayé, message d'erreur. Le code va dans un bloc ```." htmlFor="body">
            <MarkdownEditor
              id="body"
              value={draft.body}
              maxLength={10000}
              invalid={locked}
              placeholder="Décrivez votre problème…"
              onChange={(body) => setDraft({ ...draft, body })}
            />
          </Field>

          <SecretAlert
            findings={findings}
            onRedact={() => setDraft({ ...draft, title: redactSecrets(draft.title), body: redactSecrets(draft.body) })}
          />

          <Field label="Tags techniques" hint="Jusqu'à 5 tags pour orienter votre question vers les bons experts." htmlFor="tags">
            <TagInput id="tags" value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} suggestions={TAG_SUGGESTIONS} />
          </Field>

          {error ? <p role="alert" className="text-body-sm text-danger">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => toast('Brouillon enregistré sur cet appareil.')}>
              <Save className="size-4" aria-hidden /> Brouillon enregistré localement
            </Button>
            <Button size="lg" onClick={publish} loading={publishing} disabled={locked}>
              {locked ? <Lock className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {locked ? 'Publication verrouillée' : 'Publier la question'}
            </Button>
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-container-low p-3 text-body-sm text-ink-muted">
            <Zap className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden />
            Votre question recevra une première réponse de l&apos;IA en quelques secondes, puis sera
            proposée aux développeurs de la communauté.
          </p>
        </Card>

        <aside className="space-y-4">
          <Card className="space-y-3 p-4">
            <h2 className="flex items-center justify-between gap-2 text-headline-md">
              Questions déjà résolues
              {similar.isFetching ? <Spinner className="size-4 text-ink-faint" /> : null}
            </h2>
            <p className="text-body-sm text-ink-muted">Une réponse existe peut-être déjà :</p>
            {similar.data?.length ? (
              <ul className="space-y-2">
                {similar.data.map((hit) => (
                  <li key={hit.source_id}>
                    <Link href={hit.url} className="flex items-start gap-2 rounded-lg border border-line bg-container-low p-3 hover:border-primary">
                      <span className="min-w-0 flex-1 text-body-sm font-medium text-ink">{hit.title}</span>
                      <CheckCircle2 className="size-4 shrink-0 text-secondary-ink" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-label-md text-ink-faint">
                {draft.title.length < 15 ? 'Commencez à écrire votre titre…' : 'Aucune question similaire trouvée.'}
              </p>
            )}
          </Card>
          <Card className="space-y-2 border-primary/20 bg-primary-soft/30 p-4">
            <h2 className="flex items-center gap-2 font-semibold text-primary-ink">
              <Lightbulb className="size-4" aria-hidden /> Pour une réponse rapide
            </h2>
            <p className="text-body-sm text-ink-muted">
              Donnez le code minimal qui reproduit le problème et masquez vos identifiants réels :
              utilisez ceux de test (sandbox Flooz, T-Money, Wave).
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
