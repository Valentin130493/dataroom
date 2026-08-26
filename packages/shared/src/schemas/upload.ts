import { z } from 'zod';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_UPLOAD_BATCH } from '../constants';
import { ConflictStrategy } from '../enums';
import { idSchema, nameSchema } from './common';

export const uploadFileDescriptorSchema = z.object({
  name: nameSchema,
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
});
export type UploadFileDescriptor = z.infer<typeof uploadFileDescriptorSchema>;

export const initUploadSchema = z.object({
  parentId: idSchema.nullable().default(null),
  files: z.array(uploadFileDescriptorSchema).min(1).max(MAX_UPLOAD_BATCH),
});
export type InitUploadInput = z.infer<typeof initUploadSchema>;

export const confirmUploadSchema = z.object({
  uploadId: idSchema,
  onConflict: z.nativeEnum(ConflictStrategy).default(ConflictStrategy.KEEP_BOTH),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export interface UploadTicket {
  uploadId: string;
  name: string;
  storageKey: string;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresAt: string;
}

export interface FileVersionSummary {
  id: string;
  version: number;
  size: number;
  createdAt: string;
  createdByName: string | null;
  isCurrent: boolean;
}

export interface SignedContentUrl {
  url: string;
  expiresAt: string;
}
