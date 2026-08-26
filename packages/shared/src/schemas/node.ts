import { z } from 'zod';
import { SEARCH_MIN_QUERY_LENGTH } from '../constants';
import { ConflictStrategy, NodeType, Permission } from '../enums';
import { cursorPaginationSchema, idSchema, nameSchema, sortSchema } from './common';

export const createFolderSchema = z.object({
  parentId: idSchema.nullable().default(null),
  name: nameSchema,
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const renameNodeSchema = z.object({
  name: nameSchema,
  onConflict: z.nativeEnum(ConflictStrategy).default(ConflictStrategy.FAIL),
});
export type RenameNodeInput = z.infer<typeof renameNodeSchema>;

export const moveNodeSchema = z.object({
  parentId: idSchema.nullable(),
  onConflict: z.nativeEnum(ConflictStrategy).default(ConflictStrategy.FAIL),
});
export type MoveNodeInput = z.infer<typeof moveNodeSchema>;

export const listNodesSchema = cursorPaginationSchema.merge(sortSchema).extend({
  parentId: idSchema.nullable().default(null),
  type: z.nativeEnum(NodeType).optional(),
});
export type ListNodesQuery = z.infer<typeof listNodesSchema>;

export const searchNodesSchema = cursorPaginationSchema.extend({
  q: z.string().trim().min(SEARCH_MIN_QUERY_LENGTH),
  scopeId: idSchema.optional(),
  type: z.nativeEnum(NodeType).optional(),
});
export type SearchNodesQuery = z.infer<typeof searchNodesSchema>;

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface NodeSummary {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: NodeType;
  name: string;
  size: number;
  mimeType: string | null;
  version: number;
  updatedAt: string;
  createdAt: string;
}

export interface FolderStats {
  fileCount: number;
  folderCount: number;
  totalSize: number;
}

export interface NodeDetails extends NodeSummary {
  breadcrumbs: BreadcrumbItem[];
  permissions: Permission[];
  stats: FolderStats | null;
}

export interface DeletePreview {
  fileCount: number;
  folderCount: number;
  totalSize: number;
}
