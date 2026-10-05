'use client';

import { useQuery } from '@tanstack/react-query';
import { Code2, FolderGit2, MessagesSquare, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { api, unwrap } from '@/shared/api';
import { PageHeader } from '@/shared/layout';
import { Card, CardSkeleton, EmptyState, ErrorNotice, FilterChips, Segmented } from '@/shared/ui';

type SourceType = 'all' | 'snippet' | 'question' | 'project';
type Mode = 'text' | 'semantic';

const ICONS = { snippet: Code2, question: MessagesSquare, project: FolderGit2 };
const LABELS = { snippet: 'Snippet', question: 'Question résolue', project: 'Projet' };

/** Recherche dans la base de connaissances : tolérante aux fautes, ou par le sens. */
export function SearchScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const type = (params.get('type') as SourceType | null) ?? 'all';
  const mode = (params.get('mode') as Mode | null) ?? 'text';

  const results = useQuery({
    queryKey: ['search', q, type, mode],
    queryFn: () =>
      unwrap(
        api.GET('/api/knowledge/search/', {
          params: { query: { q, type: type === 'all' ? undefined : type, mode } },
        }),
      ),
    enabled: q.trim().length > 1,
    meta: { persist: false },
  });

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/search?${next}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={q ? `Résultats pour « ${q} »` : 'Rechercher'} description="Snippets publics, questions résolues et projets de la communauté." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterChips<SourceType>
          value={type}
          onChange={(value) => update('type', value === 'all' ? null : value)}
          options={[
            { value: 'all', label: 'Tout' },
            { value: 'snippet', label: 'Snippets' },
            { value: 'question', label: 'Questions' },
            { value: 'project', label: 'Projets' },
          ]}
        />
        <Segmented<Mode>
          value={mode}
          onChange={(value) => update('mode', value === 'text' ? null : value)}
          options={[
            { value: 'text', label: 'Mots-clés' },
            { value: 'semantic', label: 'Par le sens' },
          ]}
        />
      </div>
      {!q ? (
        <EmptyState icon={<Search className="size-8" aria-hidden />} title="Que cherchez-vous ?">
          Utilisez la barre de recherche en haut de la page.
        </EmptyState>
      ) : results.isPending ? (
        <CardSkeleton lines={2} />
      ) : results.isError ? (
        <ErrorNotice message="La recherche nécessite une connexion." />
      ) : !results.data?.length ? (
        <EmptyState title="Aucun résultat">Essayez la recherche « Par le sens » ou d&apos;autres mots-clés.</EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {results.data.map((hit) => {
            const Icon = ICONS[hit.source_type];
            return (
              <Link key={`${hit.source_type}-${hit.source_id}`} href={hit.url} className="flex gap-3 p-4 hover:bg-container-low">
                <Icon className="mt-1 size-5 shrink-0 text-primary-ink" aria-hidden />
                <div className="min-w-0">
                  <p className="text-label-md uppercase text-ink-muted">{LABELS[hit.source_type]}</p>
                  <p className="font-semibold text-ink">{hit.title}</p>
                  <p className="line-clamp-2 text-body-sm text-ink-muted">{hit.excerpt}</p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
