'use client';

import { BarChart3, Clapperboard, Clock, Flame, ImageIcon, Newspaper, Rows3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { TwoColumns } from '@/shared/layout';
import { useOutbox } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { Button, ButtonLink, Card, CardSkeleton, EmptyState, ErrorNotice, FilterChips, LogoMark, StatusBadge } from '@/shared/ui';

import { type PostKind, useFeed } from '../api';
import { CommunityHeader } from './Communities';
import { Composer } from './Composer';
import { PostCard } from './PostCard';

type KindFilter = 'all' | PostKind;

export function FeedScreen({ aside }: { aside?: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const tag = params.get('tag') ?? undefined;
  const kind = (params.get('kind') as KindFilter | null) ?? 'all';
  const feed = useFeed({ tag, kind: kind === 'all' ? undefined : kind });
  const pending = useOutbox('posts');

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('compose');
    router.replace(`/feed${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <TwoColumns aside={aside}>
      <h1 className="sr-only">{tag ? `Communauté d/${tag}` : "Fil d'actualité"}</h1>
      {tag ? <CommunityHeader tag={tag} /> : null}
      {isAuthenticated ? <Composer autoFocus={params.get('compose') === '1'} community={tag} key={tag ?? 'home'} /> : <WelcomeCard />}

      <div className="flex items-center gap-3">
        <span className="hidden shrink-0 items-center gap-1.5 text-body-sm font-semibold text-ink sm:flex">
          <Flame className="size-4 text-primary" aria-hidden /> Récents
        </span>
        <div className="min-w-0 flex-1">
          <FilterChips<KindFilter>
            value={kind}
            onChange={(value) => setParam('kind', value === 'all' ? null : value)}
            options={[
              { value: 'all', label: 'Tout', icon: <Rows3 className="size-4" aria-hidden /> },
              { value: 'text', label: 'Publications', icon: <Newspaper className="size-4" aria-hidden /> },
              { value: 'poll', label: 'Sondages', icon: <BarChart3 className="size-4" aria-hidden /> },
              { value: 'short', label: 'Vidéos', icon: <Clapperboard className="size-4" aria-hidden /> },
              { value: 'image', label: 'Images', icon: <ImageIcon className="size-4" aria-hidden /> },
            ]}
          />
        </div>
      </div>

      {pending.map((entry) => (
        <Card key={entry.id} className="space-y-2 border-dashed p-4">
          <StatusBadge tone="offline">
            <Clock className="size-3" aria-hidden /> En attente de réseau
          </StatusBadge>
          <p className="whitespace-pre-wrap text-body-md text-ink">{String(entry.data.body ?? '')}</p>
          <p className="text-body-sm text-ink-faint">Sera publié automatiquement au retour de la connexion.</p>
        </Card>
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
          action={tag ? <Button variant="ghost" onClick={() => setParam('tag', null)}>Voir tout le fil</Button> : undefined}
        >
          Soyez le premier à partager une astuce avec la communauté.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {feed.items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
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
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 bg-[linear-gradient(120deg,var(--primary-soft),var(--secondary-soft))] p-5">
        <LogoMark size={48} className="shrink-0" />
        <div className="space-y-1">
          <h2 className="text-headline-md text-ink">Le réseau d&apos;entraide des développeurs africains</h2>
          <p className="text-body-md text-ink-muted">
            Questions avec réponse IA instantanée, snippets disponibles hors ligne, projets open source qui
            recrutent. Pensé pour la 3G.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        <ButtonLink href="/login">Rejoindre la communauté</ButtonLink>
        <Link href="/questions" className="inline-flex h-10 items-center rounded-full px-4 text-body-md font-semibold text-ink-muted hover:bg-container">
          Explorer l&apos;entraide
        </Link>
      </div>
    </Card>
  );
}
