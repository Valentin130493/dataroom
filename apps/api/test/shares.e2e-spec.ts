import { createFolder, createRoom, createShare, tokenOf, uploadFile } from './builders';
import { Actor, Harness, createHarness } from './harness';

describe('sharing', () => {
  let harness: Harness;
  let owner: Actor;
  let guest: Actor;
  let roomId: string;
  let legal: { id: string };

  beforeAll(async () => {
    harness = await createHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();

    owner = await harness.signUp('owner@acme.test');
    guest = await harness.signUp('guest@acme.test');

    roomId = await createRoom(owner);
    legal = await createFolder(owner, roomId, 'Legal');
  });

  describe('a public link', () => {
    it('stops working the moment it is revoked', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
      });
      const token = tokenOf(share);
      const visitor = harness.anonymous();

      await visitor.get(`/public/shares/${token}`).expect(200);

      await owner.delete(`/shares/${share.id}`).expect(204);

      const response = await visitor.get(`/public/shares/${token}`);

      expect(response.status).toBe(410);
      expect(response.body).toMatchObject({ code: 'SHARE_REVOKED' });
    });

    it('reports expiry separately from revocation', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      const response = await harness.anonymous().get(`/public/shares/${tokenOf(share)}`);

      expect(response.status).toBe(410);
      expect(response.body).toMatchObject({ code: 'SHARE_EXPIRED' });
    });

    it('dies with the item it points at', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
      });

      await owner.delete(`/nodes/${legal.id}`).expect(204);

      await harness.anonymous().get(`/public/shares/${tokenOf(share)}`).expect(410);
    });

    it('dies with the data room', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: null,
        type: 'PUBLIC_LINK',
      });

      await owner.delete(`/data-rooms/${roomId}`).expect(204);

      await harness.anonymous().get(`/public/shares/${tokenOf(share)}`).expect(410);
    });

    it('hands out a download url for a file inside it', async () => {
      const file = await uploadFile(harness, owner, roomId, 'public.pdf', { parentId: legal.id });
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
      });

      const response = await harness
        .anonymous()
        .get(`/public/shares/${tokenOf(share)}/nodes/${file.id}/content-url`)
        .expect(200);

      expect(response.body.url).toContain('https://storage.test/object/');
    });
  });

  describe('a permissioned share', () => {
    it('is refused without recipients', async () => {
      await owner
        .post('/shares', {
          dataRoomId: roomId,
          nodeId: legal.id,
          type: 'RESTRICTED',
          role: 'VIEWER',
          emails: [],
          expiresAt: null,
        })
        .expect(400);
    });

    it('closes access when a recipient is removed', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'RESTRICTED',
        emails: [guest.email],
      });

      await guest.get(`/nodes/${legal.id}`).expect(200);

      const recipient = share.recipients[0];

      await owner.delete(`/shares/${share.id}/recipients/${recipient?.id}`).expect(200);

      await guest.get(`/nodes/${legal.id}`).expect(404);
    });

    it('closes access when the whole share is revoked', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'RESTRICTED',
        emails: [guest.email],
      });

      await owner.delete(`/shares/${share.id}`).expect(204);

      await guest.get(`/nodes/${legal.id}`).expect(404);
      await expect(guest.get('/shared-with-me').expect(200)).resolves.toMatchObject({
        body: [],
      });
    });

    it('adds more recipients later', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'RESTRICTED',
        emails: [guest.email],
      });
      const other = await harness.signUp('other@acme.test');

      await owner
        .post(`/shares/${share.id}/recipients`, { emails: [other.email] })
        .expect(201);

      await other.get(`/nodes/${legal.id}`).expect(200);
    });
  });

  describe('management', () => {
    it('is refused to a recipient', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'RESTRICTED',
        emails: [guest.email],
      });

      await guest.delete(`/shares/${share.id}`).expect(403);
      await guest
        .post('/shares', {
          dataRoomId: roomId,
          nodeId: legal.id,
          type: 'PUBLIC_LINK',
          role: 'VIEWER',
          emails: [],
          expiresAt: null,
        })
        .expect(403);
    });

    it('lists only the shares of the requested target', async () => {
      const financials = await createFolder(owner, roomId, 'Financials');

      await createShare(owner, { dataRoomId: roomId, nodeId: legal.id, type: 'PUBLIC_LINK' });

      const forLegal = await owner
        .get(`/shares?dataRoomId=${roomId}&nodeId=${legal.id}`)
        .expect(200);
      const forFinancials = await owner
        .get(`/shares?dataRoomId=${roomId}&nodeId=${financials.id}`)
        .expect(200);

      expect(forLegal.body).toHaveLength(1);
      expect(forFinancials.body).toHaveLength(0);
    });
  });
});
