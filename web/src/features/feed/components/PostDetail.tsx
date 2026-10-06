'use client';

import { ArrowLeft, MessagesSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CommentThread } from '@/features/discussions';
import { TwoColumns } from '@/shared/layout';
import { formatCount } from '@/shared/lib';
import { useSession } from '@/shared/session';
import { CardSkeleton, CommunityIcon, ErrorNotice, SideCard } from '@/shared/ui';

import { type Post, useCommunities, usePost } from '../api';
import { PopularCommunitiesCard } from './Communities';
import { PostCard } from './PostCard';

/** Un post et sa discussion, comme la page d'un post Reddit. */
export function PostDetail({ id, initial }: { id: string; initial?: Post }) {
  const post = usePost(id, initial);
  const router = useRouter();
  const community = post.data?.tags[0];
  return (
    <TwoColumns aside={community ? <AboutCommunity tag={community} /> : <PopularCommunitiesCard />}>
      <div className="flex items-start gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Retour"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/feed'))}
          className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full bg-container text-ink transition-colors hover:bg-container-high sm:flex"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          {post.data ? (
            <PostCard post={post.data} detail />
          ) : post.isError ? (
            <ErrorNotice title="Post introuvable" message="Il a peut-être été supprimé, ou n'est pas encore disponible hors ligne." />
          ) : (
            <CardSkeleton lines={4} />
          )}
        </div>
      </div>
      {post.data ? (
        <div className="border-t border-line pt-5 sm:pl-12">
          <CommentThread postId={post.data.id} commentCount={post.data.comment_count} />
        </div>
      ) : null}
    </TwoColumns>
  );
}

/** « À propos de la communauté » (colonne de droite d'un post). */
function AboutCommunity({ tag }: { tag: string }) {
  const communities = useCommunities(50);
  const { isAuthenticated } = useSession();
  const stats = communities.data?.find((community) => community.tag === tag);
  return (
    <>
      <SideCard>
        <div className="space-y-3 p-4">
          <Link href={`/feed?tag=${encodeURIComponent(tag)}`} className="flex items-center gap-3 hover:underline">
            <CommunityIcon tag={tag} size={40} />
            <span className="text-headline-md text-ink">d/{tag}</span>
          </Link>
          {stats ? (
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-label-md text-ink-muted">Publications</dt>
                <dd className="font-bold text-ink tabular-nums">{formatCount(stats.posts)}</dd>
              </div>
              <div>
                <dt className="text-label-md text-ink-muted">Questions</dt>
                <dd className="font-bold text-ink tabular-nums">{formatCount(stats.questions)}</dd>
              </div>
            </dl>
          ) : null}
          <p className="text-body-sm text-ink-muted">Activité des 90 derniers jours sur AfriDev.</p>
          <div className="flex flex-wrap gap-2">
            {isAuthenticated ? (
              <Link
                href={`/submit?tag=${encodeURIComponent(tag)}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-body-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                <Plus className="size-4" aria-hidden /> Créer un post
              </Link>
            ) : null}
            <Link
              href={`/questions?tag=${encodeURIComponent(tag)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-body-sm font-semibold text-ink hover:bg-container-high"
            >
              <MessagesSquare className="size-4" aria-hidden /> Questions
            </Link>
          </div>
        </div>
      </SideCard>
      <PopularCommunitiesCard />
    </>
  );
}
