'use client';

import { postSchema } from '@afridev/validation';
import { BarChart3, Code2, ImageIcon, MessageCircleQuestion, Plus, Send, Video, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { errorMessage } from '@/shared/api';
import { DraftStatus, useAutosaveDraft } from '@/shared/drafts';
import { cn } from '@/shared/lib';
import { type MediaAsset, uploadMedia } from '@/shared/media';
import { SecretAlert, useSecretScan } from '@/shared/security-guard';
import { useSession } from '@/shared/session';
import { Avatar, Button, Card, Input, TagInput, Textarea, useToast } from '@/shared/ui';

import { type PostKind, useCommunities, useCreatePost } from '../api';

interface Draft {
  kind: PostKind;
  body: string;
  options: string[];
  tags: string[];
}

const EMPTY: Draft = { kind: 'text', body: '', options: ['', ''], tags: [] };

const TOOLS: Array<{ kind: PostKind | 'code'; label: string; icon: typeof ImageIcon; color: string }> = [
  { kind: 'image', label: 'Image', icon: ImageIcon, color: 'text-secondary' },
  { kind: 'short', label: 'Vidéo', icon: Video, color: 'text-primary' },
  { kind: 'poll', label: 'Sondage', icon: BarChart3, color: 'text-tertiary' },
  { kind: 'code', label: 'Code', icon: Code2, color: 'text-ink' },
];

/**
 * « Créer une publication » façon LinkedIn : une barre compacte qui s'ouvre au clic
 * (texte, code, sondage, image, vidéo courte), avec le choix des communautés.
 */
export function Composer({ autoFocus = false, community }: { autoFocus?: boolean; community?: string }) {
  const { profile } = useSession();
  const toast = useToast();
  const create = useCreatePost();
  const communities = useCommunities(8);
  const initial: Draft = community ? { ...EMPTY, tags: [community] } : EMPTY;
  const [draft, setDraft] = useState<Draft>(initial);
  const [expanded, setExpanded] = useState(autoFocus);
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const autosave = useAutosaveDraft<Draft>('post:new', draft, (restored) => {
    setDraft({ ...EMPTY, ...restored });
    setExpanded(true);
  });
  const findings = useSecretScan(draft.body, ...draft.options);
  const firstName = (profile?.display_name || profile?.username || '').split(' ')[0];

  const setKind = (kind: PostKind) => {
    setExpanded(true);
    setDraft((current) => ({ ...current, kind }));
    setError(null);
    if (kind === 'image' || kind === 'short') {
      setMedia(null);
      fileInput.current?.click();
    }
  };

  function insertCode() {
    setExpanded(true);
    const element = textarea.current;
    const position = element?.selectionStart ?? draft.body.length;
    const snippet = '\n```python\n\n```\n';
    setDraft((current) => ({ ...current, body: current.body.slice(0, position) + snippet + current.body.slice(position) }));
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(position + 11, position + 11);
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setMedia(await uploadMedia(file, draft.kind === 'short' ? 'video' : 'image'));
    } catch (e) {
      setError(errorMessage(e));
      setDraft((current) => ({ ...current, kind: 'text' }));
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    setError(null);
    const parsed = postSchema.safeParse({
      kind: draft.kind,
      body: draft.body,
      pollOptions: draft.kind === 'poll' ? draft.options.filter((option) => option.trim()) : [],
      mediaId: media?.id ?? null,
      tags: draft.tags,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Publication invalide.');
      return;
    }
    try {
      const outcome = await create.mutateAsync({
        kind: parsed.data.kind,
        body: parsed.data.body,
        poll_options: parsed.data.pollOptions,
        media_id: parsed.data.mediaId ?? null,
        tags: parsed.data.tags,
      });
      setDraft(initial);
      setMedia(null);
      setExpanded(false);
      await autosave.clear();
      toast(
        outcome.queued ? 'Hors ligne : votre publication partira au retour du réseau.' : 'Publication en ligne.',
        outcome.queued ? 'queued' : 'success',
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const fileField = (
    <input
      ref={fileInput}
      type="file"
      hidden
      accept={draft.kind === 'short' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif'}
      onChange={(event) => {
        void onFile(event.target.files?.[0]);
        event.target.value = '';
      }}
    />
  );

  if (!expanded) {
    return (
      <Card className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <Avatar name={profile?.display_name || profile?.username || '?'} src={profile?.avatar_url} size={44} />
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              requestAnimationFrame(() => textarea.current?.focus());
            }}
            className="h-12 min-w-0 flex-1 truncate rounded-full border border-line-strong px-5 text-left text-body-md font-medium text-ink-muted transition-colors hover:bg-container-low"
          >
            {community ? `Publier dans d/${community}` : `Quoi de neuf${firstName ? `, ${firstName}` : ''} ?`}<span className="hidden sm:inline">{community ? '' : ' Une astuce, un bug, du code…'}</span>
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between">
          {TOOLS.map((tool) => (
            <button
              key={tool.kind}
              type="button"
              onClick={() => (tool.kind === 'code' ? insertCode() : setKind(tool.kind))}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-body-sm font-semibold text-ink-muted transition-colors hover:bg-container"
            >
              <tool.icon className={cn('size-5', tool.color)} aria-hidden /> {tool.label}
            </button>
          ))}
          <Link
            href="/questions/new"
            className="hidden h-11 flex-1 items-center justify-center gap-2 rounded-lg text-body-sm font-semibold text-ink-muted transition-colors hover:bg-container sm:inline-flex"
          >
            <MessageCircleQuestion className="size-5 text-secondary-ink" aria-hidden /> Question
          </Link>
        </div>
        {fileField}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={profile?.display_name || profile?.username || '?'} src={profile?.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{profile?.display_name || profile?.username}</p>
          <p className="text-body-sm text-ink-muted">Publication visible par toute la communauté</p>
        </div>
        <button
          type="button"
          aria-label="Réduire"
          onClick={() => setExpanded(false)}
          className="flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-container"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="space-y-3 px-4 pt-3">
        <Textarea
          ref={textarea}
          autoFocus={autoFocus}
          aria-label="Votre publication"
          placeholder={draft.kind === 'poll' ? 'Posez la question du sondage…' : 'Partagez une astuce, un bug ou du code avec la communauté…'}
          value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          maxLength={3000}
          className="min-h-32 resize-none border-0 bg-transparent px-0 text-body-lg hover:border-0 focus:ring-0"
        />

        {draft.kind === 'poll' ? (
          <div className="space-y-2 rounded-xl border border-line p-3">
            {draft.options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  aria-label={`Choix ${index + 1}`}
                  placeholder={`Choix ${index + 1}`}
                  value={option}
                  maxLength={80}
                  onChange={(event) => {
                    const options = [...draft.options];
                    options[index] = event.target.value;
                    setDraft({ ...draft, options });
                  }}
                />
                {draft.options.length > 2 ? (
                  <button
                    type="button"
                    aria-label="Retirer ce choix"
                    onClick={() => setDraft({ ...draft, options: draft.options.filter((_, i) => i !== index) })}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-container"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            ))}
            {draft.options.length < 4 ? (
              <Button variant="plain" size="sm" onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}>
                <Plus className="size-4" aria-hidden /> Ajouter un choix
              </Button>
            ) : null}
          </div>
        ) : null}

        {draft.kind === 'image' || draft.kind === 'short' ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-container-low px-4 py-3 text-body-sm">
            <span className="text-ink-muted">
              {uploading
                ? 'Compression et envoi du média…'
                : media
                  ? media.status === 'ready'
                    ? 'Média prêt à publier'
                    : 'Média envoyé, traitement en cours (publiable maintenant)'
                  : 'Aucun fichier choisi'}
            </span>
            <span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                Choisir
              </Button>
              <Button
                variant="plain"
                size="sm"
                onClick={() => {
                  setMedia(null);
                  setDraft({ ...draft, kind: 'text' });
                }}
              >
                Retirer
              </Button>
            </span>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-body-sm font-semibold text-ink">Communautés</p>
          <TagInput
            value={draft.tags}
            max={5}
            onChange={(tags) => setDraft({ ...draft, tags })}
            suggestions={(communities.data ?? []).map((item) => item.tag)}
          />
        </div>
        {fileField}
        <SecretAlert findings={findings} />
        {error ? (
          <p role="alert" className="text-body-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
        <div className="flex flex-wrap gap-0.5">
          {TOOLS.map((tool) => {
            const active = tool.kind === draft.kind;
            return (
              <button
                key={tool.kind}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                aria-pressed={tool.kind === 'code' ? undefined : active}
                onClick={() => (tool.kind === 'code' ? insertCode() : setKind(active ? 'text' : (tool.kind as PostKind)))}
                className={cn(
                  'inline-flex size-10 items-center justify-center rounded-full transition-colors',
                  active ? 'bg-primary-soft' : 'hover:bg-container',
                )}
              >
                <tool.icon className={cn('size-5', tool.color)} aria-hidden />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <DraftStatus savedAt={autosave.savedAt} />
          <Button onClick={publish} loading={create.isPending} disabled={uploading || findings.length > 0 || (!draft.body.trim() && !media)}>
            Publier <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </Card>
  );
}
