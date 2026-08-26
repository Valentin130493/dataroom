'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  SortDirection,
  SortField,
  type CreateFolderInput,
  type MoveNodeInput,
  type NodeSummary,
  type RenameNodeInput,
} from '@dataroom/shared';
import { nodesApi } from '@/lib/api/endpoints';
import { messageOf } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export interface SortState {
  sortBy: SortField;
  sortDir: SortDirection;
}

export const DEFAULT_SORT: SortState = {
  sortBy: SortField.NAME,
  sortDir: SortDirection.ASC,
};

export function useNodeList(dataRoomId: string, parentId: string | null, sort: SortState) {
  return useInfiniteQuery({
    queryKey: queryKeys.nodes(dataRoomId, { parentId, ...sort }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      nodesApi.list(dataRoomId, { parentId, cursor: pageParam, ...sort }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useNodeDetails(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.node(nodeId ?? 'none'),
    queryFn: () => nodesApi.details(nodeId as string),
    enabled: Boolean(nodeId),
  });
}

export function useNodeSearch(dataRoomId: string, query: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.search(dataRoomId, query),
    queryFn: () => nodesApi.search(dataRoomId, { q: query, limit: 20 }),
    enabled,
  });
}

export function useNodeVersions(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.nodeVersions(nodeId ?? 'none'),
    queryFn: () => nodesApi.versions(nodeId as string),
    enabled: Boolean(nodeId),
  });
}

export function useNodeContentUrl(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.nodeContent(nodeId ?? 'none'),
    queryFn: () => nodesApi.contentUrl(nodeId as string),
    enabled: Boolean(nodeId),
    staleTime: 60_000,
  });
}

export function useDeletePreview(nodeId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.node(nodeId ?? 'none'), 'delete-preview'],
    queryFn: () => nodesApi.deletePreview(nodeId as string),
    enabled: Boolean(nodeId),
  });
}

function useNodeMutation<TVariables, TResult>(
  dataRoomId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
  onDone: (result: TResult) => void,
  errorMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nodeChildren(dataRoomId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
      onDone(result);
    },
    onError: (error) => toast.error(messageOf(error, errorMessage)),
  });
}

export function useCreateFolder(dataRoomId: string) {
  return useNodeMutation<CreateFolderInput, NodeSummary>(
    dataRoomId,
    (input) => nodesApi.createFolder(dataRoomId, input),
    (folder) => toast.success(`Created "${folder.name}"`),
    'Could not create the folder',
  );
}

export function useRenameNode(dataRoomId: string) {
  return useNodeMutation<{ id: string; input: RenameNodeInput }, NodeSummary>(
    dataRoomId,
    ({ id, input }) => nodesApi.rename(id, input),
    (node) => toast.success(`Renamed to "${node.name}"`),
    'Could not rename this item',
  );
}

export function useMoveNode(dataRoomId: string) {
  return useNodeMutation<{ id: string; input: MoveNodeInput }, NodeSummary>(
    dataRoomId,
    ({ id, input }) => nodesApi.move(id, input),
    (node) => toast.success(`Moved "${node.name}"`),
    'Could not move this item',
  );
}

export function useDeleteNode(dataRoomId: string) {
  return useNodeMutation<{ id: string; name: string }, void>(
    dataRoomId,
    ({ id }) => nodesApi.remove(id),
    () => toast.success('Deleted'),
    'Could not delete this item',
  );
}
