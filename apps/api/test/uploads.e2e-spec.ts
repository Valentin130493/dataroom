import { MAX_FILE_SIZE_BYTES, STORAGE_QUOTA_BYTES } from '@dataroom/shared';
import { createRoom, uploadFile } from './builders';
import { Actor, Harness, createHarness } from './harness';

describe('uploads', () => {
  let harness: Harness;
  let owner: Actor;
  let roomId: string;

  beforeAll(async () => {
    harness = await createHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
    owner = await harness.signUp('owner@acme.test');
    roomId = await createRoom(owner);
  });

  const initUpload = (name: string, size: number) =>
    owner.post(`/data-rooms/${roomId}/uploads`, {
      parentId: null,
      files: [{ name, size, mimeType: 'application/pdf' }],
    });

  describe('validation', () => {
    it('refuses a type that is not on the allow list', async () => {
      const response = await owner.post(`/data-rooms/${roomId}/uploads`, {
        parentId: null,
        files: [{ name: 'clip.mp4', size: 10, mimeType: 'video/mp4' }],
      });

      expect(response.status).toBe(400);
    });

    it('accepts the other document types', async () => {
      await owner
        .post(`/data-rooms/${roomId}/uploads`, {
          parentId: null,
          files: [
            { name: 'notes.txt', size: 10, mimeType: 'text/plain' },
            { name: 'chart.png', size: 20, mimeType: 'image/png' },
            {
              name: 'model.xlsx',
              size: 30,
              mimeType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ],
        })
        .expect(201);
    });

    it('refuses a file over the per-file cap', async () => {
      await initUpload('huge.pdf', MAX_FILE_SIZE_BYTES + 1).expect(400);
    });

    it('accepts a file at exactly the cap', async () => {
      await initUpload('exact.pdf', MAX_FILE_SIZE_BYTES).expect(201);
    });
  });

  describe('the storage quota', () => {
    it('reports what is used', async () => {
      harness.storage.usedBytes = 2048;

      const response = await owner.get('/storage/usage').expect(200);

      expect(response.body).toEqual({
        usedBytes: 2048,
        quotaBytes: STORAGE_QUOTA_BYTES,
        objectCount: expect.any(Number),
      });
    });

    it('refuses an upload that would not fit', async () => {
      harness.storage.usedBytes = STORAGE_QUOTA_BYTES - 100;

      const response = await initUpload('overflow.pdf', 1024);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'STORAGE_QUOTA_EXCEEDED' });
    });

    it('allows an upload that fits exactly', async () => {
      harness.storage.usedBytes = STORAGE_QUOTA_BYTES - 1024;

      await initUpload('snug.pdf', 1024).expect(201);
    });

    it('counts every file of a batch together', async () => {
      harness.storage.usedBytes = STORAGE_QUOTA_BYTES - 1500;

      const response = await owner.post(`/data-rooms/${roomId}/uploads`, {
        parentId: null,
        files: [
          { name: 'a.pdf', size: 1000, mimeType: 'application/pdf' },
          { name: 'b.pdf', size: 1000, mimeType: 'application/pdf' },
        ],
      });

      expect(response.status).toBe(409);
    });
  });

  describe('the upload session', () => {
    it('cannot be confirmed twice', async () => {
      const init = await initUpload('once.pdf', 512).expect(201);
      const [ticket] = init.body as { uploadId: string }[];

      await owner
        .post('/uploads/confirm', { uploadId: ticket?.uploadId, onConflict: 'KEEP_BOTH' })
        .expect(201);

      await owner
        .post('/uploads/confirm', { uploadId: ticket?.uploadId, onConflict: 'KEEP_BOTH' })
        .expect(404);
    });

    it('cannot be confirmed by somebody else', async () => {
      const init = await initUpload('mine.pdf', 512).expect(201);
      const [ticket] = init.body as { uploadId: string }[];
      const stranger = await harness.signUp('stranger@acme.test');

      await stranger
        .post('/uploads/confirm', { uploadId: ticket?.uploadId, onConflict: 'KEEP_BOTH' })
        .expect(404);
    });

    it('releases the reserved object when aborted', async () => {
      const init = await initUpload('abandoned.pdf', 512).expect(201);
      const [ticket] = init.body as { uploadId: string }[];

      await owner.delete(`/uploads/${ticket?.uploadId}`).expect(204);

      expect(harness.storage.removed).toHaveLength(1);
    });

    it('records the first version of a new file', async () => {
      const file = await uploadFile(harness, owner, roomId, 'versioned.pdf', { size: 700 });

      const versions = await owner.get(`/nodes/${file.id}/versions`).expect(200);

      expect(versions.body).toEqual([
        expect.objectContaining({ version: 1, size: 700, isCurrent: true }),
      ]);
    });
  });
});
