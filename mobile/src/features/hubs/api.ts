import type { Schemas } from '@afridev/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from '@/shared/api';
import { useInfiniteList } from '@/shared/query';

export type Hub = Schemas['HubOutput'];

export interface HubFilters {
  q?: string;
  mine?: boolean;
  sort?: 'popular' | 'new';
}

export const hubKeys = {
  list: (filters: HubFilters) => ['hubs', 'list', filters] as const,
  detail: (slug: string) => ['hubs', 'detail', slug] as const,
};

export function useHubs(filters: HubFilters = {}, enabled = true) {
  return useInfiniteList(
    hubKeys.list(filters),
    (cursor) => unwrap(api.GET('/api/hubs/', { params: { query: { cursor, ...filters } } })),
    { enabled },
  );
}

export function useHub(slug: string | undefined) {
  return useQuery({
    queryKey: hubKeys.detail(slug ?? ''),
    queryFn: () => unwrap(api.GET('/api/hubs/{slug}/', { params: { path: { slug: slug! } } })),
    enabled: Boolean(slug),
  });
}

/** Rejoindre (true) ou quitter (false) ; la fiche du hub revient à jour. */
export function useJoinHub(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (join: boolean) => {
      const options = { params: { path: { slug } } };
      return unwrap(join ? api.POST('/api/hubs/{slug}/join/', options) : api.DELETE('/api/hubs/{slug}/join/', options));
    },
    onSuccess: (hub) => {
      queryClient.setQueryData(hubKeys.detail(hub.slug), hub);
      void queryClient.invalidateQueries({ queryKey: ['hubs', 'list'] });
    },
  });
}
