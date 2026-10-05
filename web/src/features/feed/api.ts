'use client';

import type { Schemas } from '@afridev/api-client';
import { type InfiniteData, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from '@/shared/api';
import { sendOrQueue } from '@/shared/offline';
import { type Page, useInfiniteList } from '@/shared/query';

export type Post = Schemas['PostOutput'];
export type PostKind = Schemas['PostKindEnum'];

export interface FeedFilters {
  kind?: PostKind;
  author?: string;
  tag?: string;
}

export const feedKeys = {
  all: ['feed'] as const,
  list: (filters: FeedFilters) => ['feed', 'list', filters] as const,
  detail: (id: string) => ['feed', 'post', id] as const,
};

export function useFeed(filters: FeedFilters = {}) {
  return useInfiniteList(feedKeys.list(filters), (cursor) =>
    unwrap(api.GET('/api/feed/', { params: { query: { cursor, ...filters } } })),
  );
}

export function usePost(id: string, initialData?: Post) {
  return useQuery({
    queryKey: feedKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/feed/{post_id}/', { params: { path: { post_id: id } } })),
    initialData,
  });
}

/** Remplace un post partout où il est affiché (listes et détail). */
function replacePost(queryClient: QueryClient, post: Post) {
  queryClient.setQueryData(feedKeys.detail(post.id), post);
  queryClient.setQueriesData<InfiniteData<Page<Post>>>({ queryKey: ['feed', 'list'] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            results: page.results.map((item) => (item.id === post.id ? post : item)),
          })),
        }
      : data,
  );
}

export interface NewPost {
  kind: PostKind;
  body: string;
  poll_options?: string[];
  media_id?: string | null;
  tags?: string[];
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPost) => {
      const id = crypto.randomUUID();
      const body = { id, ...input, poll_options: input.poll_options ?? [], tags: input.tags ?? [] };
      // Un post avec média exige le réseau (le fichier doit être envoyé d'abord).
      if (input.media_id) {
        return unwrap(api.POST('/api/feed/', { body })).then((result) => ({ queued: false as const, result }));
      }
      return sendOrQueue(() => unwrap(api.POST('/api/feed/', { body })), {
        id,
        op: 'PUT',
        type: 'posts',
        data: { kind: input.kind, body: input.body, poll_options: body.poll_options, media_id: null, tags: body.tags },
        label: `Post : ${input.body.slice(0, 40)}`,
      });
    },
    onSuccess: (outcome) => {
      if (!outcome.queued) void queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
    },
  });
}

export function useLike(post: Post) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) =>
      unwrap(api.POST('/api/feed/{post_id}/like/', { params: { path: { post_id: post.id } }, body: { liked } })),
    onMutate: (liked) => {
      // Affichage immédiat, corrigé par la réponse du serveur.
      replacePost(queryClient, {
        ...post,
        like_count: Math.max(0, post.like_count + (liked ? 1 : -1)),
        viewer: { liked, vote: post.viewer?.vote ?? null },
      });
    },
    onSuccess: (updated) => replacePost(queryClient, updated),
    onError: () => replacePost(queryClient, post),
  });
}

export function useVote(post: Post) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (option: number) =>
      unwrap(api.POST('/api/feed/{post_id}/vote/', { params: { path: { post_id: post.id } }, body: { option } })),
    onSuccess: (updated) => replacePost(queryClient, updated),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/api/feed/{post_id}/', { params: { path: { post_id: id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKeys.all }),
  });
}

export type Community = Schemas['Community'];

/** Communautés = tags les plus actifs des 90 derniers jours (posts + questions). */
export function useCommunities(limit = 12) {
  return useQuery({
    queryKey: ['feed', 'communities', limit],
    queryFn: () => unwrap(api.GET('/api/feed/communities/', { params: { query: { limit } } })),
    staleTime: 10 * 60_000,
  });
}