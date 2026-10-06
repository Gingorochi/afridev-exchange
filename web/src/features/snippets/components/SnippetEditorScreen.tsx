'use client';

import { snippetSchema } from '@afridev/validation';
import { Lock, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '@/shared/api';
import { DraftStatus, useAutosaveDraft } from '@/shared/drafts';
import { PageHeader } from '@/shared/layout';
import { formatBytes, utf8Size } from '@/shared/lib';
import { redactSecrets, SecretAlert, useSecretScan } from '@/shared/security-guard';
import { Button, Card, CardSkeleton, CodeEditor, Field, Input, Select, Switch, TagInput, useToast } from '@/shared/ui';

import { LANGUAGES, type SnippetInput, useSaveSnippet, useSnippet } from '../api';

const EMPTY: SnippetInput = { title: '', language: 'python', content: '', tags: [], is_public: false };

/** Création et modification d'un snippet (Security Guard en direct, brouillon automatique). */
export function SnippetEditorScreen({ id }: { id?: string }) {
  const existing = useSnippet(id);
  if (id && !existing.data) return existing.isError ? <p>Snippet introuvable.</p> : <CardSkeleton lines={8} />;
  return <Editor id={id} initial={existing.data ?? undefined} />;
}

function Editor({ id, initial }: { id?: string; initial?: SnippetInput & { id: string } }) {
  const router = useRouter();
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
  const flaggedLines = findings.map((finding) => finding.line);

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
      await autosave.clear();
      if (outcome.queued) toast('Hors ligne : enregistré, envoi au retour du réseau.', 'queued');
      else toast('Snippet enregistré.');
      router.push(outcome.queued ? '/snippets' : `/snippets/${outcome.result.id}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Link href="/snippets" className="hover:underline">Coffre snippets</Link> / {id ? 'Modifier' : 'Nouveau'}
          </>
        }
        title={id ? 'Modifier le snippet' : 'Nouveau snippet'}
        actions={<DraftStatus savedAt={autosave.savedAt} />}
      />
      <Card className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field label="Titre" required htmlFor="snippet-title" counter={`${form.title.length} / 120`}>
            <Input
              id="snippet-title"
              value={form.title}
              maxLength={120}
              placeholder="Ex. Vérification de signature webhook Wave"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Langage" htmlFor="snippet-language">
            <Select id="snippet-language" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Code" required htmlFor="snippet-code" counter={formatBytes(utf8Size(form.content))}>
          <CodeEditor
            id="snippet-code"
            label="Code"
            value={form.content}
            onChange={(content) => setForm({ ...form, content })}
            flaggedLines={flaggedLines}
            placeholder="# Collez votre code ici"
            minRows={14}
          />
        </Field>
        <SecretAlert
          findings={findings}
          onRedact={() => setForm({ ...form, content: redactSecrets(form.content), title: redactSecrets(form.title) })}
        />
        <Field label="Tags" htmlFor="snippet-tags" hint="Langage, framework, domaine (jusqu'à 8).">
          <TagInput id="snippet-tags" value={form.tags} max={8} onChange={(tags) => setForm({ ...form, tags })} suggestions={['wave', 'orange-money', 'ussd', 'docker', 'postgresql']} />
        </Field>
        {!id ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-container-low p-3">
            <div>
              <p className="font-semibold text-ink">Publier dans la communauté</p>
              <p className="text-body-sm text-ink-muted">
                Visible par tous et ajouté à la base de connaissances de l&apos;IA. Une seconde analyse
                (IA) le repasse en privé s&apos;il expose une donnée sensible.
              </p>
            </div>
            <Switch checked={form.is_public} onChange={(is_public) => setForm({ ...form, is_public })} label="Publier dans la communauté" />
          </div>
        ) : null}
        {error ? <p role="alert" className="text-body-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => router.back()}>Annuler</Button>
          <Button onClick={submit} loading={save.isPending} disabled={findings.length > 0}>
            {findings.length ? <Lock className="size-4" aria-hidden /> : <Save className="size-4" aria-hidden />}
            {findings.length ? 'Enregistrement verrouillé' : 'Enregistrer'}
          </Button>
        </div>
      </Card>
    </>
  );
}
