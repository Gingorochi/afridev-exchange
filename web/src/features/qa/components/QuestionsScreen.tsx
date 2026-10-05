'use client';

import { CheckCircle2, Clock, MessageCircle, MessagesSquare, Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { TwoColumns } from '@/shared/layout';
import { cn } from '@/shared/lib';
import { useOutbox } from '@/shared/offline';
import { useSession } from '@/shared/session';
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardSkeleton,
  CommunityIcon,
  EmptyState,
  ErrorNotice,
  StatusBadge,
  Tabs,
  Tag,
  TimeAgo,
} from '@/shared/ui';

import { type Question, useQuestions } from '../api';

type Status = 'all' | 'open' | 'resolved';

export function QuestionsScreen({ aside }: { aside?: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const status = (params.get('status') as Status | null) ?? 'all';
  const tag = params.get('tag') ?? undefined;
  const query = params.get('q') ?? undefined;
  const questions = useQuestions({ q: query, tag, resolved: status === 'all' ? undefined : status === 'resolved' });
  const pending = useOutbox('questions');

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/questions${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <TwoColumns aside={aside}>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-[linear-gradient(120deg,var(--secondary-soft),var(--primary-soft))] px-5 py-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
            <MessagesSquare className="size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-headline-lg text-ink">Entraide & IA</h1>
            <p className="text-body-md text-ink-muted">
              Une première réponse de l&apos;IA en quelques secondes, puis l&apos;expertise des développeurs du continent.
            </p>
          </div>
        </div>
        <AskBar />
      </Card>

      <Card className="px-4">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update('q', search.trim() || null);
          }}
          className="relative pt-3"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 mt-1.5 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un bug, un code d'erreur, une techno…"
            aria-label="Rechercher dans les questions"
            className="h-10 w-full rounded-full bg-container pr-4 pl-10 text-body-md text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </form>
        <div className="flex items-end justify-between gap-3">
          <Tabs<Status>
            className="border-0"
            value={status}
            onChange={(value) => update('status', value === 'all' ? null : value)}
            options={[
              { value: 'all', label: 'Toutes' },
              { value: 'open', label: 'Sans solution' },
              { value: 'resolved', label: 'Résolues' },
            ]}
          />
          {tag || query ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                router.replace('/questions', { scroll: false });
              }}
              className="mb-2 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 text-body-sm font-semibold text-primary-ink"
            >
              {tag ? `d/${tag}` : `« ${query} »`} <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </Card>

      {pending.map((entry) => (
        <Card key={entry.id} className="flex items-start gap-3 border-dashed p-4">
          <Clock className="mt-1 size-4 text-offline" aria-hidden />
          <div>
            <StatusBadge tone="offline">En attente de réseau</StatusBadge>
            <p className="mt-1 font-semibold text-ink">{String(entry.data.title)}</p>
          </div>
        </Card>
      ))}

      {questions.isPending ? (
        <>
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </>
      ) : questions.isError && !questions.items.length ? (
        <ErrorNotice message="Les questions s'afficheront dès le retour du réseau." />
      ) : !questions.items.length ? (
        <EmptyState
          icon={<MessagesSquare className="size-7" aria-hidden />}
          title="Aucune question trouvée"
          action={<ButtonLink href="/questions/new">Poser la première</ButtonLink>}
        >
          Changez de filtre ou posez votre question : l&apos;IA vous répond tout de suite.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {questions.items.map((question) => (
            <QuestionRow key={question.id} question={question} />
          ))}
        </div>
      )}
      {questions.hasNextPage ? (
        <Button variant="ghost" className="w-full" onClick={() => questions.fetchNextPage()} loading={questions.isFetchingNextPage}>
          Voir plus de questions
        </Button>
      ) : null}
    </TwoColumns>
  );
}

function AskBar() {
  const { isAuthenticated, profile } = useSession();
  return (
    <div className="flex items-center gap-3 border-t border-line px-4 py-3">
      {isAuthenticated ? <Avatar name={profile?.display_name || profile?.username || '?'} src={profile?.avatar_url} size={40} /> : null}
      <Link
        href={isAuthenticated ? '/questions/new' : '/login?next=/questions/new'}
        className="flex h-11 flex-1 items-center rounded-full border border-line-strong px-5 text-body-md font-medium text-ink-muted transition-colors hover:bg-container-low"
      >
        Bloqué sur un bug ? Posez votre question…
      </Link>
      <ButtonLink href={isAuthenticated ? '/questions/new' : '/login?next=/questions/new'} className="hidden sm:inline-flex">
        Demander
      </ButtonLink>
    </div>
  );
}

/** Question dans une liste : statut et réponses, titre, extrait, communauté et tags. */
export function QuestionRow({ question, compact = false }: { question: Question; compact?: boolean }) {
  const name = question.author?.display_name || question.author?.username || 'Membre';
  const [community, ...tags] = question.tags;
  return (
    <article className="group relative rounded-xl border border-line bg-card px-4 py-3.5 shadow-card transition-colors hover:border-line-strong sm:px-5">
      <div className="flex items-center gap-2 text-body-sm">
        {community ? (
          <span className="relative z-10 flex items-center gap-1.5 font-bold text-ink">
            <CommunityIcon tag={community} size={20} />
            <Link href={`/questions?tag=${encodeURIComponent(community)}`} className="hover:underline">
              d/{community}
            </Link>
          </span>
        ) : null}
        {community ? <span className="text-ink-faint" aria-hidden>•</span> : null}
        <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
          <Avatar name={name} src={question.author?.avatar_url} size={18} />
          <span className="truncate">{name}</span>
        </span>
        <span className="text-ink-faint" aria-hidden>•</span>
        <TimeAgo date={question.created_at} className="shrink-0 text-ink-faint" />
      </div>
      <h3 className="mt-1.5 text-headline-md text-ink">
        <Link href={`/questions/${question.id}`} className="after:absolute after:inset-0 group-hover:text-primary-ink">
          {question.title}
        </Link>
      </h3>
      {!compact && question.body ? <p className="mt-1 line-clamp-2 text-body-md text-ink-muted">{question.body}</p> : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-body-sm font-semibold',
            question.is_resolved ? 'bg-secondary text-white' : question.answer_count ? 'bg-container text-ink' : 'bg-tertiary-soft text-on-tertiary-soft',
          )}
        >
          {question.is_resolved ? <CheckCircle2 className="size-4" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
          {question.is_resolved
            ? 'Résolue'
            : question.answer_count
              ? `${question.answer_count} réponse${question.answer_count > 1 ? 's' : ''}`
              : 'En attente de réponse'}
        </span>
        {question.ai_answer_status === 'ready' ? (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-soft px-2.5 text-body-sm font-semibold text-primary-ink">
            <Sparkles className="size-3.5" aria-hidden /> Réponse IA
          </span>
        ) : null}
        {tags.slice(0, 3).map((tag) => (
          <span key={tag} className="relative z-10">
            <Tag href={`/questions?tag=${encodeURIComponent(tag)}`}>{tag}</Tag>
          </span>
        ))}
      </div>
    </article>
  );
}
