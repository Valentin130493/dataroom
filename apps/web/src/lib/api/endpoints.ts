import type {
  AddRecipientsInput,
  AuthConfig,
  AuthUser,
  ConfirmUploadInput,
  CreateDataRoomInput,
  CreateFolderInput,
  CreateShareInput,
  DataRoomSummary,
  DeletePreview,
  FileVersionSummary,
  InitUploadInput,
  ListNodesQuery,
  MoveNodeInput,
  NodeDetails,
  NodeSummary,
  Page,
  PublicShareContext,
  RenameDataRoomInput,
  RenameNodeInput,
  SearchNodesQuery,
  ShareSummary,
  SharedWithMeItem,
  SignInInput,
  SignUpInput,
  SignedContentUrl,
  StorageUsage,
  UploadTicket,
} from '@dataroom/shared';
import { api } from './http';

type ListParams = Partial<ListNodesQuery> & { cursor?: string };

export const authApi = {
  config: () => api.get<AuthConfig>('/auth/config'),
  me: () => api.get<AuthUser>('/auth/me'),
  signUp: (input: SignUpInput) => api.post<AuthUser>('/auth/signup', input),
  signIn: (input: SignInInput) => api.post<AuthUser>('/auth/login', input),
  signOut: () => api.post<void>('/auth/logout'),
};

export const dataRoomsApi = {
  list: () => api.get<DataRoomSummary[]>('/data-rooms'),
  get: (id: string) => api.get<DataRoomSummary>(`/data-rooms/${id}`),
  create: (input: CreateDataRoomInput) => api.post<DataRoomSummary>('/data-rooms', input),
  rename: (id: string, input: RenameDataRoomInput) =>
    api.patch<DataRoomSummary>(`/data-rooms/${id}`, input),
  remove: (id: string) => api.delete<void>(`/data-rooms/${id}`),
};

export const nodesApi = {
  list: (dataRoomId: string, params: ListParams) =>
    api.get<Page<NodeSummary>>(`/data-rooms/${dataRoomId}/nodes`, {
      query: {
        parentId: params.parentId ?? undefined,
        cursor: params.cursor,
        limit: params.limit,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        type: params.type,
      },
    }),
  search: (dataRoomId: string, params: SearchNodesQuery) =>
    api.get<Page<NodeSummary>>(`/data-rooms/${dataRoomId}/search`, {
      query: { q: params.q, scopeId: params.scopeId, cursor: params.cursor, limit: params.limit },
    }),
  details: (id: string) => api.get<NodeDetails>(`/nodes/${id}`),
  createFolder: (dataRoomId: string, input: CreateFolderInput) =>
    api.post<NodeSummary>(`/data-rooms/${dataRoomId}/folders`, input),
  rename: (id: string, input: RenameNodeInput) => api.patch<NodeSummary>(`/nodes/${id}`, input),
  move: (id: string, input: MoveNodeInput) => api.post<NodeSummary>(`/nodes/${id}/move`, input),
  deletePreview: (id: string) => api.get<DeletePreview>(`/nodes/${id}/delete-preview`),
  remove: (id: string) => api.delete<void>(`/nodes/${id}`),
  contentUrl: (id: string) => api.get<SignedContentUrl>(`/nodes/${id}/content-url`),
  versions: (id: string) => api.get<FileVersionSummary[]>(`/nodes/${id}/versions`),
};

export const uploadsApi = {
  init: (dataRoomId: string, input: InitUploadInput) =>
    api.post<UploadTicket[]>(`/data-rooms/${dataRoomId}/uploads`, input),
  confirm: (input: ConfirmUploadInput) => api.post<NodeSummary>('/uploads/confirm', input),
  abort: (uploadId: string) => api.delete<void>(`/uploads/${uploadId}`),
};

export const storageApi = {
  usage: () => api.get<StorageUsage>('/storage/usage'),
};

export const sharesApi = {
  list: (dataRoomId: string, nodeId: string | null) =>
    api.get<ShareSummary[]>('/shares', { query: { dataRoomId, nodeId } }),
  create: (input: CreateShareInput) => api.post<ShareSummary>('/shares', input),
  revoke: (id: string) => api.delete<void>(`/shares/${id}`),
  addRecipients: (id: string, input: AddRecipientsInput) =>
    api.post<ShareSummary>(`/shares/${id}/recipients`, input),
  removeRecipient: (id: string, recipientId: string) =>
    api.delete<ShareSummary>(`/shares/${id}/recipients/${recipientId}`),
  sharedWithMe: () => api.get<SharedWithMeItem[]>('/shared-with-me'),
};

export const publicShareApi = {
  context: (token: string) => api.get<PublicShareContext>(`/public/shares/${token}`),
  list: (token: string, params: ListParams) =>
    api.get<Page<NodeSummary>>(`/public/shares/${token}/nodes`, {
      query: {
        parentId: params.parentId ?? undefined,
        cursor: params.cursor,
        limit: params.limit,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      },
    }),
  details: (token: string, nodeId: string) =>
    api.get<NodeDetails>(`/public/shares/${token}/nodes/${nodeId}`),
  contentUrl: (token: string, nodeId: string) =>
    api.get<SignedContentUrl>(`/public/shares/${token}/nodes/${nodeId}/content-url`),
};
