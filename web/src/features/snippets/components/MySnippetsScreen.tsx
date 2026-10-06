'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Download,
  Globe,
  Lock,
  Pencil,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/shared/layout';
import { formatBytes, utf8Size } from '@/shared/lib';
import { useOutbox, useStorageEstimate } from '@/shared/offline';
import {
  Button,
  ButtonLink,
  Card,
  CardSkeleton,
  CodeBlock,
  CopyButton,
  EmptyState,
  ErrorNotice,
  FilterChips,
  Input,
  Segmented,
  StatusBadge,
  Tag,
  TimeAgo,
} from '@/shared/ui';

import { type Snippet, useMySnippets, useSnippetActions } from '../api';

type Visibility = 'all' | 'public' | 'private';

function downloadJson(snippets: Snippet[]) {
  const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `afridev-coffre-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function MySnippetsScreen() {
  const snippets = useMySnippets();
  const pending = useOutbox('snippets').filter((entry) => entry.op === 'PUT');
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [language, setLanguage] = useState('all');

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const snippet of snippets.items) counts.set(snippet.language, (counts.get(snippet.language) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [snippets.items]);

  const visible = snippets.items.filter((snippet) => {
    if (visibility === 'public' && !snippet.is_public) return false;
    if (visibility === 'private' && snippet.is_public) return false;
    if (language !== 'all' && snippet.language !== language) return false;
    if (!query.trim()) return true;
    const text = `${snippet.title} ${snippet.tags.join(' ')} ${snippet.content}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const totalSize = snippets.items.reduce((sum, snippet) => sum + utf8Size(snippet.content), 0);
  const publicCount = snippets.items.filter((snippet) => snippet.is_public).length;

  return (
    <>
      <PageHeader
        title="Mon coffre-fort de snippets"
        description="Commandes, scripts et recettes d'intégration, accessibles même sans réseau. Vos snippets privés ne quittent jamais votre compte."
        actions={
          <>
            <Button variant="ghost" onClick={() => downloadJson(snippets.items)} disabled={!snippets.items.length}>
              <Download className="size-4" aria-hidden /> Exporter (JSON)
            </Button>
            <ButtonLink href="/snippets/new">
              <Plus className="size-4" aria-hidden /> Nouveau snippet
            </ButtonLink>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-container-low px-4 py-2 text-body-sm text-ink-muted">
        <CheckCircle2 className="size-4 text-secondary-ink" aria-hidden />
        <span>{snippets.items.length} snippets</span>
        <span aria-hidden>·</span>
        <span>{snippets.source === 'local' ? 'Copie SQLite synchronisée' : 'Cache local actif'}</span>
        <span aria-hidden>·</span>
        <span>Empreinte : {formatBytes(totalSize)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher dans mes snippets, fonctions, tags…"
                aria-label="Rechercher dans mes snippets"
                className="pl-9"
              />
            </div>
            <Segmented
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'all', label: 'Tous', count: snippets.items.length },
                { value: 'public', label: 'Publics', count: publicCount },
                { value: 'private', label: 'Privés', count: snippets.items.length - publicCount },
              ]}
            />
          </div>
          {languages.length > 1 ? (
            <FilterChips
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'all', label: `Tous (${snippets.items.length})` },
                ...languages.map(([lang, count]) => ({ value: lang, label: `${lang} (${count})` })),
              ]}
            />
          ) : null}

          {pending.map((entry) => (
            <Card key={entry.id} className="flex items-center gap-3 border-dashed p-4">
              <Clock className="size-4 text-offline" aria-hidden />
              <span className="flex-1 font-semibold">{String(entry.data.title)}</span>
              <StatusBadge tone="offline">En attente de réseau</StatusBadge>
            </Card>
          ))}

          {snippets.isPending ? (
            <>
              <CardSkeleton lines={4} />
              <CardSkeleton lines={4} />
            </>
          ) : snippets.isError && !snippets.items.length ? (
            <ErrorNotice message="Votre coffre s'affichera dès le retour du réseau, puis restera disponible hors ligne." />
          ) : !visible.length ? (
            <EmptyState
              icon={<Code2 className="size-8" aria-hidden />}
              title={snippets.items.length ? 'Aucun snippet ne correspond' : 'Votre coffre est vide'}
              action={<ButtonLink href="/snippets/new">Ajouter un snippet</ButtonLink>}
            >
              Gardez ici vos commandes Docker, scripts USSD ou recettes mobile money pour les retrouver
              même sans connexion.
            </EmptyState>
          ) : (
            visible.map((snippet) => <SnippetCard key={snippet.id} snippet={snippet} />)
          )}
          {snippets.source === 'api' && snippets.remote.hasNextPage ? (
            <Button variant="ghost" className="w-full" onClick={() => snippets.remote.fetchNextPage()} loading={snippets.remote.isFetchingNextPage}>
              Charger plus
            </Button>
          ) : null}
        </div>
        <VaultAside />
      </div>
    </>
  );
}

function SnippetCard({ snippet }: { snippet: Snippet }) {
  const { publish, remove } = useSnippetActions();
  const review = snippet.ai_review as { risky?: boolean; reasons?: string[] };
  const flagged = Boolean(review?.risky) && !snippet.is_public;
  const preview = snippet.content.split('\n').slice(0, 6).join('\n');

  return (
    <Card className="space-y-3 p-4">
      {flagged ? (
        <div className="flex gap-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-on-danger-soft">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-body-sm">
            <span className="font-mono font-semibold uppercase">Retiré de la publication : donnée sensible probable.</span>{' '}
            {review.reasons?.join(' ') ?? ''} Corrigez-le puis republiez.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge dot={false}>{snippet.language}</StatusBadge>
            {snippet.is_public ? (
              <StatusBadge tone="primary" dot={false}><Globe className="size-3" aria-hidden /> Public</StatusBadge>
            ) : (
              <StatusBadge dot={false}><Lock className="size-3" aria-hidden /> Privé</StatusBadge>
            )}
            <StatusBadge tone="success" dot={false}><CheckCircle2 className="size-3" aria-hidden /> Dispo hors ligne</StatusBadge>
          </div>
          <h2 className="text-headline-md">
            <Link href={`/snippets/${snippet.id}`} className="hover:text-primary-ink">{snippet.title}</Link>
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={snippet.content} label="" className="size-9 justify-center rounded text-ink-muted hover:bg-container" />
          <Link href={`/snippets/${snippet.id}/edit`} aria-label="Modifier" className="flex size-9 items-center justify-center rounded text-ink-muted hover:bg-container">
            <Pencil className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            aria-label="Supprimer"
            onClick={() => window.confirm('Supprimer ce snippet ?') && remove.mutate(snippet.id)}
            className="flex size-9 items-center justify-center rounded text-ink-muted hover:bg-container hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <CodeBlock code={preview} language={snippet.language} maxHeight={180} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {snippet.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <div className="flex items-center gap-3 text-label-md text-ink-muted">
          <span>Mis à jour <TimeAgo date={snippet.updated_at} /> · {formatBytes(utf8Size(snippet.content))}</span>
          <Button
            variant={snippet.is_public ? 'ghost' : 'secondary'}
            size="sm"
            loading={publish.isPending}
            onClick={() => publish.mutate({ id: snippet.id, value: !snippet.is_public })}
          >
            {snippet.is_public ? 'Rendre privé' : 'Publier'}
          </Button>
        </div>
      </div>
      {publish.isError ? <p className="text-body-sm text-danger">{publish.error.message}</p> : null}
    </Card>
  );
}

function VaultAside() {
  const storage = useStorageEstimate();
  return (
    <aside className="space-y-4">
      <Card className="space-y-3 p-4">
        <h2 className="flex items-center justify-between text-headline-md">
          Espace coffre local <Database className="size-5 text-secondary-ink" aria-hidden />
        </h2>
        {storage ? (
          <>
            <div className="flex justify-between text-body-sm text-ink-muted">
              <span>Stockage utilisé</span>
              <span>{formatBytes(storage.usage)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-container-high">
              <div className="h-full bg-secondary" style={{ width: `${Math.min(100, Math.max(2, (storage.usage / (50 * 1024 * 1024)) * 100))}%` }} />
            </div>
          </>
        ) : null}
        <p className="flex items-center justify-between rounded-lg border border-line bg-container-low px-3 py-2 text-body-sm">
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-secondary-ink" aria-hidden /> Security Guard</span>
          <span className="text-label-md text-secondary-ink">Actif hors ligne</span>
        </p>
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Plane className="size-4 text-primary-ink" aria-hidden /> Mode voyageur / 2G
        </h2>
        <p className="text-body-sm text-ink-muted">
          Hors couverture, votre coffre reste consultable et modifiable : les changements partent
          dès que le réseau revient. Exportez-le en JSON pour une copie de secours.
        </p>
      </Card>
    </aside>
  );
}
