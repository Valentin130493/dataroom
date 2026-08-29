import type { NodeSummary, ShareSummary } from '@dataroom/shared';
import type { Actor, Harness } from './harness';

export async function createRoom(actor: Actor, name = 'Project Atlas'): Promise<string> {
  const response = await actor.post('/data-rooms', { name }).expect(201);

  return (response.body as { id: string }).id;
}

export async function createFolder(
  actor: Actor,
  dataRoomId: string,
  name: string,
  parentId: string | null = null,
): Promise<NodeSummary> {
  const response = await actor
    .post(`/data-rooms/${dataRoomId}/folders`, { parentId, name })
    .expect(201);

  return response.body as NodeSummary;
}

export async function uploadFile(
  harness: Harness,
  actor: Actor,
  dataRoomId: string,
  name: string,
  options: { parentId?: string | null; size?: number; onConflict?: string } = {},
): Promise<NodeSummary> {
  const init = await actor
    .post(`/data-rooms/${dataRoomId}/uploads`, {
      parentId: options.parentId ?? null,
      files: [{ name, size: options.size ?? 1024, mimeType: 'application/pdf' }],
    })
    .expect(201);

  const [ticket] = init.body as { uploadId: string }[];

  const confirm = await actor.post('/uploads/confirm', {
    uploadId: ticket?.uploadId,
    onConflict: options.onConflict ?? 'KEEP_BOTH',
  });

  if (confirm.status !== 201) {
    throw Object.assign(new Error(`Upload of ${name} failed`), { response: confirm });
  }

  return confirm.body as NodeSummary;
}

export async function createShare(
  actor: Actor,
  input: {
    dataRoomId: string;
    nodeId?: string | null;
    type: 'PUBLIC_LINK' | 'RESTRICTED';
    emails?: string[];
    expiresAt?: string | null;
  },
): Promise<ShareSummary> {
  const response = await actor
    .post('/shares', {
      dataRoomId: input.dataRoomId,
      nodeId: input.nodeId ?? null,
      type: input.type,
      role: 'VIEWER',
      emails: input.emails ?? [],
      expiresAt: input.expiresAt ?? null,
    })
    .expect(201);

  return response.body as ShareSummary;
}

export function tokenOf(share: ShareSummary): string {
  return (share.url as string).split('/s/')[1] as string;
}
