import { createFolder, createRoom, uploadFile } from './builders';
import { Actor, Harness, createHarness } from './harness';

describe('folders and files', () => {
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

  describe('name conflicts', () => {
    it('refuses a duplicate folder name in the same parent', async () => {
      await createFolder(owner, roomId, 'Legal');

      const response = await owner.post(`/data-rooms/${roomId}/folders`, {
        parentId: null,
        name: 'Legal',
      });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'NAME_CONFLICT' });
    });

    it('treats names case-insensitively', async () => {
      await createFolder(owner, roomId, 'Legal');

      await owner
        .post(`/data-rooms/${roomId}/folders`, { parentId: null, name: 'LEGAL' })
        .expect(409);
    });

    it('allows the same name in a different parent', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');

      await createFolder(owner, roomId, 'Legal', legal.id);
    });

    it('frees the name once the folder is deleted', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');

      await owner.delete(`/nodes/${legal.id}`).expect(204);
      await createFolder(owner, roomId, 'Legal');
    });

    it('numbers an uploaded file instead of overwriting it', async () => {
      await uploadFile(harness, owner, roomId, 'report.pdf');
      const second = await uploadFile(harness, owner, roomId, 'report.pdf');

      expect(second.name).toBe('report (1).pdf');
    });

    it('skips numbers that are already taken', async () => {
      await uploadFile(harness, owner, roomId, 'report.pdf');
      await uploadFile(harness, owner, roomId, 'report.pdf');
      const third = await uploadFile(harness, owner, roomId, 'report.pdf');

      expect(third.name).toBe('report (2).pdf');
    });

    it('replaces a file with a new version when asked', async () => {
      const first = await uploadFile(harness, owner, roomId, 'report.pdf', { size: 100 });
      const second = await uploadFile(harness, owner, roomId, 'report.pdf', {
        size: 250,
        onConflict: 'REPLACE',
      });

      expect(second.id).toBe(first.id);
      expect(second.version).toBe(2);
      expect(second.size).toBe(250);

      const versions = await owner.get(`/nodes/${first.id}/versions`).expect(200);

      expect(versions.body).toHaveLength(2);
    });

    it('refuses a rename onto an existing name', async () => {
      await createFolder(owner, roomId, 'Legal');
      const financials = await createFolder(owner, roomId, 'Financials');

      await owner
        .patch(`/nodes/${financials.id}`, { name: 'Legal', onConflict: 'FAIL' })
        .expect(409);
    });

    it('keeps both on a rename when asked', async () => {
      await createFolder(owner, roomId, 'Legal');
      const financials = await createFolder(owner, roomId, 'Financials');

      const response = await owner
        .patch(`/nodes/${financials.id}`, { name: 'Legal', onConflict: 'KEEP_BOTH' })
        .expect(200);

      expect(response.body.name).toBe('Legal (1)');
    });

    it('holds the invariant when two uploads of one name race', async () => {
      const results = await Promise.all([
        uploadFile(harness, owner, roomId, 'race.pdf'),
        uploadFile(harness, owner, roomId, 'race.pdf'),
      ]);

      expect(new Set(results.map((node) => node.name)).size).toBe(2);
    });
  });

  describe('moving', () => {
    it('re-roots the whole subtree', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');
      const contracts = await createFolder(owner, roomId, 'Contracts', legal.id);
      const file = await uploadFile(harness, owner, roomId, 'deep.pdf', {
        parentId: contracts.id,
      });
      const archive = await createFolder(owner, roomId, 'Archive');

      await owner.post(`/nodes/${legal.id}/move`, { parentId: archive.id }).expect(200);

      const details = await owner.get(`/nodes/${file.id}`).expect(200);

      expect(details.body.breadcrumbs.map((crumb: { name: string }) => crumb.name)).toEqual([
        'Archive',
        'Legal',
        'Contracts',
      ]);
    });

    it('refuses to move a folder into itself', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');

      const response = await owner.post(`/nodes/${legal.id}/move`, { parentId: legal.id });

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ code: 'INVALID_MOVE_TARGET' });
    });

    it('refuses to move a folder into its own descendant', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');
      const contracts = await createFolder(owner, roomId, 'Contracts', legal.id);

      await owner.post(`/nodes/${legal.id}/move`, { parentId: contracts.id }).expect(422);
    });

    it('moves the weight from the old parent to the new one', async () => {
      const from = await createFolder(owner, roomId, 'From');
      const to = await createFolder(owner, roomId, 'To');
      const file = await uploadFile(harness, owner, roomId, 'weight.pdf', {
        parentId: from.id,
        size: 500,
      });

      await owner.post(`/nodes/${file.id}/move`, { parentId: to.id }).expect(200);

      const before = await owner.get(`/nodes/${from.id}`).expect(200);
      const after = await owner.get(`/nodes/${to.id}`).expect(200);

      expect(before.body.stats).toMatchObject({ fileCount: 0, totalSize: 0 });
      expect(after.body.stats).toMatchObject({ fileCount: 1, totalSize: 500 });
    });
  });

  describe('deleting', () => {
    it('takes the whole subtree with it', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');
      const contracts = await createFolder(owner, roomId, 'Contracts', legal.id);
      const file = await uploadFile(harness, owner, roomId, 'gone.pdf', {
        parentId: contracts.id,
      });

      await owner.delete(`/nodes/${legal.id}`).expect(204);

      await owner.get(`/nodes/${contracts.id}`).expect(410);
      await owner.get(`/nodes/${file.id}`).expect(410);
    });

    it('reports what is about to disappear', async () => {
      const legal = await createFolder(owner, roomId, 'Legal');
      const contracts = await createFolder(owner, roomId, 'Contracts', legal.id);

      await uploadFile(harness, owner, roomId, 'a.pdf', { parentId: contracts.id, size: 300 });
      await uploadFile(harness, owner, roomId, 'b.pdf', { parentId: legal.id, size: 200 });

      const preview = await owner.get(`/nodes/${legal.id}/delete-preview`).expect(200);

      expect(preview.body).toEqual({ folderCount: 1, fileCount: 2, totalSize: 500 });
    });

    it('releases the stored objects', async () => {
      const file = await uploadFile(harness, owner, roomId, 'blob.pdf');
      const before = harness.storage.objects.size;

      await owner.delete(`/nodes/${file.id}`).expect(204);

      expect(harness.storage.objects.size).toBe(before - 1);
      expect(harness.storage.removed).toHaveLength(1);
    });

    it('subtracts the weight from the room', async () => {
      const file = await uploadFile(harness, owner, roomId, 'heavy.pdf', { size: 4096 });

      const withFile = await owner.get(`/data-rooms/${roomId}`).expect(200);
      expect(withFile.body).toMatchObject({ fileCount: 1, totalSize: 4096 });

      await owner.delete(`/nodes/${file.id}`).expect(204);

      const without = await owner.get(`/data-rooms/${roomId}`).expect(200);
      expect(without.body).toMatchObject({ fileCount: 0, totalSize: 0 });
    });
  });

  describe('listing and search', () => {
    it('puts folders before files', async () => {
      await uploadFile(harness, owner, roomId, 'aaa.pdf');
      await createFolder(owner, roomId, 'zzz');

      const response = await owner.get(`/data-rooms/${roomId}/nodes`).expect(200);

      expect(response.body.items.map((item: { name: string }) => item.name)).toEqual([
        'zzz',
        'aaa.pdf',
      ]);
    });

    it('pages with a cursor', async () => {
      await createFolder(owner, roomId, 'one');
      await createFolder(owner, roomId, 'two');
      await createFolder(owner, roomId, 'three');

      const first = await owner.get(`/data-rooms/${roomId}/nodes?limit=2`).expect(200);

      expect(first.body.items).toHaveLength(2);
      expect(first.body.nextCursor).toBeTruthy();

      const second = await owner
        .get(`/data-rooms/${roomId}/nodes?limit=2&cursor=${first.body.nextCursor}`)
        .expect(200);

      expect(second.body.items).toHaveLength(1);
      expect(second.body.nextCursor).toBeNull();
    });

    it('finds a file by part of its name, ignoring case', async () => {
      await uploadFile(harness, owner, roomId, 'Quarterly report.pdf');

      const response = await owner.get(`/data-rooms/${roomId}/search?q=quarter`).expect(200);

      expect(response.body.items).toHaveLength(1);
    });

    it('does not return deleted items', async () => {
      const file = await uploadFile(harness, owner, roomId, 'temporary.pdf');

      await owner.delete(`/nodes/${file.id}`).expect(204);

      const response = await owner.get(`/data-rooms/${roomId}/search?q=temporary`).expect(200);

      expect(response.body.items).toHaveLength(0);
    });
  });
});
