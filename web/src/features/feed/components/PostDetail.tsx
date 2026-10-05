'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { CommentThread } from '@/features/discussions';
import { TwoColumns } from '@/shared/layout';
import { Card, CardSkeleton, ErrorNotice } from '@/shared/ui';

import { type Post, usePost } from '../api';
import { PopularCommunitiesCard } from './Communities';
import { PostCard } from './PostCard';

/** Un post et sa discussion (cible des notifications et des liens partagés). */
export function PostDetail({ id, initial }: { id: string; initial?: Post }) {
  const post = usePost(id, initial);
  const router = useRouter();
  return (
    <TwoColumns aside={<PopularCommunitiesCard />}>
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push('/feed'))}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-body-sm font-semibold text-ink-muted shadow-card ring-1 ring-line hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Retour
      </button>
      {post.data ? (
        <>
          <PostCard post={post.data} detail />
          <Card className="p-4 sm:p-5">
            <CommentThread postId={post.data.id} commentCount={post.data.comment_count} />
          </Card>
        </>
      ) : post.isError ? (
        <ErrorNotice title="Post introuvable" message="Il a peut-être été supprimé, ou n'est pas encore disponible hors ligne." />
      ) : (
        <CardSkeleton lines={4} />
      )}
    </TwoColumns>
  );
}
