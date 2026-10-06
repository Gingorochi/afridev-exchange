'use client';

import { CheckCircle2, Clock, MessageCircle, MessagesSquare, Plus, Search, Sparkles, X } from 'lucide-react';
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
  const { isAuthenticated } = useSession();

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/questions${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <TwoColumns aside={aside}>
      {/* En-tête façon page de communauté : bannière, icône, titre et action principale. */}
      <section>
        <div className="h-20 rounded-2xl bg-[linear-gradient(120deg,var(--secondary)_0%,var(--secondary-hover)_50%,var(--tertiary)_100%)] sm:h-24" aria-hidden />
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 px-2 sm:px-4">
          <span className="-mt-10 flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-surface bg-secondary text-white">
            <MessagesSquare className="size-9" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-headline-xl text-ink">Entraide & IA</h1>
            <p className="text-body-sm text-ink-muted">Une première réponse de l&apos;IA en quelques secondes, puis la communauté.</p>
          </div>
          <ButtonLink href={isAuthenticated ? '/questions/new' : '/login?next=/questions/new'} className="mb-1">
            <Plus className="size-4" aria-hidden /> Poser une question
          </ButtonLink>
        </div>
      </section>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update('q', search.trim() || null);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un bug, un code d'erreur, une techno…"
          aria-label="Rechercher dans les questions"
          className="h-11 w-full rounded-full bg-container pr-4 pl-11 text-body-md text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />
      </form>

      <div>
        <div className="flex items-end justify-between gap-3">
          <Tabs<Status>
            className="flex-1"
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
      </div>

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
        <ul className="-mt-2">
          {questions.items.map((question, index) => (
            <li key={question.id}>
              {index ? <hr className="my-1 border-line" /> : null}
              <QuestionRow question={question} />
            </li>
          ))}
        </ul>
      )}
      {questions.hasNextPage ? (
        <Button variant="ghost" className="w-full" onClick={() => questions.fetchNextPage()} loading={questions.isFetchingNextPage}>
          Voir plus de questions
        </Button>
      ) : null}
    </TwoColumns>
  );
}

/** Question dans une liste (bloc sans cadre, comme un post du fil) : statut, titre, extrait, tags. */
export function QuestionRow({ question, compact = false }: { question: Question; compact?: boolean }) {
  const name = question.author?.display_name || question.author?.username || 'Membre';
  const [community, ...tags] = question.tags;
  return (
    <article className="group relative -mx-2 rounded-2xl px-2 py-2.5 transition-colors hover:bg-container-low sm:-mx-4 sm:px-4">
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
      <h3 className="mt-1.5 text-[1.125rem] leading-snug font-semibold text-ink">
        <Link href={`/questions/${question.id}`} className="after:absolute after:inset-0">
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
