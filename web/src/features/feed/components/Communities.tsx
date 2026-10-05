'use client';

import { Flame } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { cn, formatCount } from '@/shared/lib';
import { Card, CommunityIcon, Skeleton } from '@/shared/ui';

import { useCommunities } from '../api';

const activity = (posts: number, questions: number) => {
  const total = posts + questions;
  return `${formatCount(total)} ${total > 1 ? 'publications' : 'publication'}`;
};

/** Communautés du menu latéral (d/python, d/mobile-money…). */
export function CommunityNav() {
  return (
    <Suspense fallback={<Skeleton className="mx-3 h-24" />}>
      <CommunityNavList />
    </Suspense>
  );
}

function CommunityNavList() {
  const communities = useCommunities(8);
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === '/feed' ? params.get('tag') : null;

  if (communities.isPending) return <Skeleton className="mx-3 h-24" />;
  if (!communities.data?.length) {
    return <p className="px-3 text-body-sm text-ink-faint">Les communautés apparaissent avec les premiers tags publiés.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {communities.data.map((community) => (
        <li key={community.tag}>
          <Link
            href={`/feed?tag=${encodeURIComponent(community.tag)}`}
            aria-current={current === community.tag ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center gap-3 rounded-lg px-3 text-body-md transition-colors',
              current === community.tag ? 'bg-container-high font-semibold text-ink' : 'text-ink-muted hover:bg-container hover:text-ink',
            )}
          >
            <CommunityIcon tag={community.tag} size={24} />
            <span className="truncate">d/{community.tag}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Carte « Communautés populaires » de la colonne de droite. */
export function PopularCommunitiesCard() {
  const communities = useCommunities(6);
  return (
    <Card className="overflow-hidden">
      <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-label-md font-bold tracking-wide text-ink-muted uppercase">
        <Flame className="size-4 text-primary" aria-hidden /> Communautés populaires
      </h2>
      {communities.isPending ? (
        <div className="px-4 pb-4">
          <Skeleton className="h-28" />
        </div>
      ) : communities.data?.length ? (
        <ol className="pb-2">
          {communities.data.map((community, index) => (
            <li key={community.tag}>
              <Link
                href={`/feed?tag=${encodeURIComponent(community.tag)}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-container-low"
              >
                <span className="w-4 text-body-sm font-semibold text-ink-faint tabular-nums">{index + 1}</span>
                <CommunityIcon tag={community.tag} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-body-md font-semibold text-ink">d/{community.tag}</span>
                  <span className="block text-body-sm text-ink-muted">{activity(community.posts, community.questions)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 pb-4 text-body-sm text-ink-muted">Ajoutez des tags à vos publications pour faire naître des communautés.</p>
      )}
    </Card>
  );
}

/** Bandeau d'une communauté (fil filtré par tag), façon page de subreddit. */
export function CommunityHeader({ tag }: { tag: string }) {
  const communities = useCommunities(50);
  const stats = communities.data?.find((community) => community.tag === tag);
  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-[linear-gradient(120deg,var(--primary)_0%,var(--tertiary)_55%,var(--secondary)_100%)] sm:h-24" aria-hidden />
      <div className="flex flex-wrap items-end gap-4 px-4 pb-4">
        <CommunityIcon tag={tag} size={72} className="-mt-8 border-4 border-card text-[1.75rem]" />
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="text-headline-lg text-ink">d/{tag}</h1>
          <p className="text-body-sm text-ink-muted">
            {stats ? `${activity(stats.posts, stats.questions)} ces 90 derniers jours` : 'Communauté AfriDev'}
          </p>
        </div>
        <Link
          href={`/questions?tag=${encodeURIComponent(tag)}`}
          className="mb-1 inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-body-sm font-semibold text-ink hover:bg-container"
        >
          Questions de d/{tag}
        </Link>
      </div>
    </Card>
  );
}
