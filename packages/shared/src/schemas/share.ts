import { z } from 'zod';
import { ShareRole, ShareType } from '../enums';
import { emailSchema } from './auth';
import { idSchema } from './common';

export const createShareSchema = z
  .object({
    dataRoomId: idSchema,
    nodeId: idSchema.nullable().default(null),
    type: z.nativeEnum(ShareType),
    role: z.nativeEnum(ShareRole).default(ShareRole.VIEWER),
    emails: z.array(emailSchema).max(50).default([]),
    expiresAt: z.string().datetime().nullable().default(null),
  })
  .refine((value) => value.type === ShareType.PUBLIC_LINK || value.emails.length > 0, {
    message: 'At least one recipient is required for a restricted share',
    path: ['emails'],
  });
export type CreateShareInput = z.infer<typeof createShareSchema>;

export const addRecipientsSchema = z.object({
  emails: z.array(emailSchema).min(1).max(50),
});
export type AddRecipientsInput = z.infer<typeof addRecipientsSchema>;

export interface ShareRecipientSummary {
  id: string;
  email: string;
  userId: string | null;
  hasAccepted: boolean;
  invitedAt: string;
}

export interface ShareSummary {
  id: string;
  dataRoomId: string;
  nodeId: string | null;
  targetName: string;
  type: ShareType;
  role: ShareRole;
  url: string | null;
  expiresAt: string | null;
  createdAt: string;
  recipients: ShareRecipientSummary[];
}

export interface SharedWithMeItem {
  shareId: string;
  dataRoomId: string;
  nodeId: string | null;
  name: string;
  type: 'DATA_ROOM' | 'FOLDER' | 'FILE';
  role: ShareRole;
  ownerName: string | null;
  sharedAt: string;
}

export interface PublicShareContext {
  shareId: string;
  role: ShareRole;
  rootName: string;
  rootNodeId: string | null;
  dataRoomId: string;
  expiresAt: string | null;
}
