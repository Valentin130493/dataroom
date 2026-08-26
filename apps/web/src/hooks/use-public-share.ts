'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { publicShareApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { DEFAULT_SORT, type SortState } from './use-nodes';

export function usePublicShare(token: string) {
  return useQuery({
    queryKey: queryKeys.publicShare(token),
    queryFn: () => publicShareApi.context(token),
    retry: false,
  });
}

export function usePublicNode(token: string, nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.publicNode(token, nodeId ?? 'root'),
    queryFn: () => publicShareApi.details(token, nodeId as string),
    enabled: Boolean(nodeId),
    retry: false,
  });
}

export function usePublicNodes(
  token: string,
  parentId: string | null,
  enabled: boolean,
  sort: SortState = DEFAULT_SORT,
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.publicNodes(token, parentId), sort.sortBy, sort.sortDir],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      publicShareApi.list(token, { parentId, cursor: pageParam, ...sort }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    retry: false,
  });
}

export function usePublicContentUrl(token: string, nodeId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.publicNode(token, nodeId ?? 'none'), 'content'],
    queryFn: () => publicShareApi.contentUrl(token, nodeId as string),
    enabled: Boolean(nodeId),
    staleTime: 60_000,
    retry: false,
  });
}
