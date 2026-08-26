import { z } from 'zod';
import { nameSchema } from './common';

export const createDataRoomSchema = z.object({
  name: nameSchema,
});
export type CreateDataRoomInput = z.infer<typeof createDataRoomSchema>;

export const renameDataRoomSchema = z.object({
  name: nameSchema,
});
export type RenameDataRoomInput = z.infer<typeof renameDataRoomSchema>;

export interface DataRoomSummary {
  id: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
  fileCount: number;
  totalSize: number;
  updatedAt: string;
  createdAt: string;
}
