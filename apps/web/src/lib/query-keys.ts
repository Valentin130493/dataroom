import type { ListNodesQuery } from '@dataroom/shared';

type ListArgs = Pick<ListNodesQuery, 'sortBy' | 'sortDir'> & { parentId: string | null };

export const queryKeys = {
  session: ['session'] as const,
  authConfig: ['auth-config'] as const,
  dataRooms: ['data-rooms'] as const,
  storageUsage: ['storage-usage'] as const,
  dataRoom: (id: string) => ['data-rooms', id] as const,
  nodes: (dataRoomId: string, args: ListArgs) =>
    ['data-rooms', dataRoomId, 'nodes', args.parentId ?? 'root', args.sortBy, args.sortDir] as const,
  nodeChildren: (dataRoomId: string) => ['data-rooms', dataRoomId, 'nodes'] as const,
  node: (id: string) => ['nodes', id] as const,
  nodeVersions: (id: string) => ['nodes', id, 'versions'] as const,
  nodeContent: (id: string) => ['nodes', id, 'content'] as const,
  search: (dataRoomId: string, query: string) => ['data-rooms', dataRoomId, 'search', query] as const,
  shares: (dataRoomId: string, nodeId: string | null) =>
    ['shares', dataRoomId, nodeId ?? 'root'] as const,
  sharedWithMe: ['shared-with-me'] as const,
  publicShare: (token: string) => ['public-share', token] as const,
  publicNodes: (token: string, parentId: string | null) =>
    ['public-share', token, 'nodes', parentId ?? 'root'] as const,
  publicNode: (token: string, nodeId: string) => ['public-share', token, 'node', nodeId] as const,
};
