import { type QueryKey, useInfiniteQuery } from '@tanstack/react-query';

/** Page renvoyée par la pagination par curseur du backend. */
export interface Page<T> {
  next?: string | null;
  previous?: string | null;
  results: T[];
}

function cursorOf(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/[?&]cursor=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** Liste paginée par curseur, gardée en cache local (défilement infini). */
export function useInfiniteList<T>(
  queryKey: QueryKey,
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  options: { enabled?: boolean } = {},
) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => cursorOf(last.next),
    enabled: options.enabled,
  });
  const items = query.data?.pages.flatMap((page) => page.results) ?? [];
  return { ...query, items };
}
