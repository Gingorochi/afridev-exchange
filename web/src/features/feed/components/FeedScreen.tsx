'use client';

import {
  BarChart3,
  ChevronDown,
  Clapperboard,
  Clock,
  Flame,
  ImageIcon,
  Newspaper,
  Plus,
  Rows3,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { TwoColumns } from '@/shared/layout';
import { cn } from '@/shared/lib';
import { useOutbox } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { Button, ButtonLink, CardSkeleton, EmptyState, ErrorNotice, LogoMark, Menu, MenuItem, StatusBadge } from '@/shared/ui';

import { type FeedSort, type PostKind, useFeed } from '../api';
import { CommunityHeader } from './Communities';
import { PostCard } from './PostCard';

type KindFilter = 'all' | PostKind;

const SORTS: Array<{ value: FeedSort; label: string; icon: typeof Flame }> = [
  { value: 'hot', label: 'Populaires', icon: Flame },
  { value: 'new', label: 'Nouveaux', icon: Sparkles },
  { value: 'top', label: 'Top', icon: TrendingUp },
];

const KINDS: Array<{ value: KindFilter; label: string; icon: typeof Rows3 }> = [
  { value: 'all', label: 'Tous les formats', icon: Rows3 },
  { value: 'text', label: 'Publications', icon: Newspaper },
  { value: 'poll', label: 'Sondages', icon: BarChart3 },
  { value: 'short', label: 'Vidéos', icon: Clapperboard },
  { value: 'image', label: 'Images', icon: ImageIcon },
];

/** Fil façon Reddit : tri en haut, posts séparés par des filets ; page de communauté avec ?tag=. */
export function FeedScreen({ aside }: { aside?: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const tag = params.get('tag') ?? undefined;
  const kind = (params.get('kind') as KindFilter | null) ?? 'all';
  const sort = (params.get('sort') as FeedSort | null) ?? 'hot';
  const feed = useFeed({ tag, sort, kind: kind === 'all' ? undefined : kind });
  const pending = useOutbox('posts');
  const currentKind = KINDS.find((item) => item.value === kind) ?? KINDS[0]!;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/feed${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <TwoColumns aside={aside}>
      <h1 className="sr-only">{tag ? `Communauté d/${tag}` : "Fil d'actualité"}</h1>
      {tag ? <CommunityHeader tag={tag} /> : null}
      {!isAuthenticated && !tag ? <WelcomeCard /> : null}

      {/* Barre de tri (Populaires · Nouveaux · Top) et choix du format. */}
      <div className="flex items-center gap-1 border-b border-line pb-2">
        <nav aria-label="Trier le fil" className="flex items-center gap-1">
          {SORTS.map((item) => {
            const active = sort === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => setParam('sort', item.value === 'hot' ? null : item.value)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-body-sm font-semibold transition-colors',
                  active ? 'bg-container-high text-ink' : 'text-ink-muted hover:bg-container hover:text-ink',
                )}
              >
                <item.icon className={cn('size-4', active && 'text-primary')} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto">
          <Menu
            className="w-56"
            trigger={(props) => (
              <button
                type="button"
                {...props}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-body-sm font-semibold text-ink-muted hover:bg-container hover:text-ink"
              >
                <currentKind.icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{currentKind.label}</span>
                <ChevronDown className="size-4" aria-hidden />
              </button>
            )}
          >
            {KINDS.map((item) => (
              <MenuItem key={item.value} onSelect={() => setParam('kind', item.value === 'all' ? null : item.value)}>
                <item.icon aria-hidden /> {item.label}
              </MenuItem>
            ))}
          </Menu>
        </div>
      </div>

      {pending.map((entry) => (
        <div key={entry.id} className="space-y-2 rounded-2xl border border-dashed border-line-strong p-4">
          <StatusBadge tone="offline">
            <Clock className="size-3" aria-hidden /> En attente de réseau
          </StatusBadge>
          <p className="font-semibold text-ink">{String(entry.data.title || entry.data.body || '')}</p>
          <p className="text-body-sm text-ink-faint">Sera publié automatiquement au retour de la connexion.</p>
        </div>
      ))}

      {feed.isPending ? (
        <>
          <CardSkeleton />
          <CardSkeleton lines={4} />
        </>
      ) : feed.isError && !feed.items.length ? (
        <ErrorNotice message="Le fil n'est pas encore disponible sur cet appareil. Il s'affichera dès le retour du réseau." />
      ) : !feed.items.length ? (
        <EmptyState
          icon={<Newspaper className="size-7" aria-hidden />}
          title={tag ? `Rien encore dans d/${tag}` : "Rien à afficher pour l'instant"}
          action={
            isAuthenticated ? (
              <ButtonLink href={tag ? `/submit?tag=${encodeURIComponent(tag)}` : '/submit'}>
                <Plus className="size-4" aria-hidden /> Créer un post
              </ButtonLink>
            ) : undefined
          }
        >
          Soyez le premier à partager une astuce avec la communauté.
        </EmptyState>
      ) : (
        <ul className="-mt-2">
          {feed.items.map((post, index) => (
            <li key={post.id}>
              {index ? <hr className="my-1 border-line" /> : null}
              <PostCard post={post} community={!tag} />
            </li>
          ))}
        </ul>
      )}

      {feed.hasNextPage ? (
        <Button variant="ghost" className="w-full" onClick={() => feed.fetchNextPage()} loading={feed.isFetchingNextPage}>
          Voir plus de publications
        </Button>
      ) : null}
    </TwoColumns>
  );
}

function WelcomeCard() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-container-low p-5 sm:flex-row sm:items-center">
      <LogoMark size={48} className="shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-headline-md text-ink">Le réseau d&apos;entraide des développeurs africains</h2>
        <p className="text-body-md text-ink-muted">
          Questions avec réponse IA instantanée, snippets disponibles hors ligne, projets open source qui recrutent.
        </p>
      </div>
      <ButtonLink href="/login" className="shrink-0">
        Rejoindre
      </ButtonLink>
    </section>
  );
}
