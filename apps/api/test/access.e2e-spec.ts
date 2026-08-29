import { createFolder, createRoom, createShare, tokenOf, uploadFile } from './builders';
import { Actor, Harness, createHarness } from './harness';

describe('access control', () => {
  let harness: Harness;
  let owner: Actor;
  let guest: Actor;
  let stranger: Actor;

  let roomId: string;
  let legal: { id: string; name: string };
  let contracts: { id: string };
  let contract: { id: string };
  let financials: { id: string };

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
    stranger = await harness.signUp('stranger@acme.test');

    roomId = await createRoom(owner);
    legal = await createFolder(owner, roomId, 'Legal');
    financials = await createFolder(owner, roomId, 'Financials');
    contracts = await createFolder(owner, roomId, 'Contracts', legal.id);
    contract = await uploadFile(harness, owner, roomId, 'agreement.pdf', {
      parentId: contracts.id,
    });
  });

  describe('an owner', () => {
    it('reads and writes anywhere in the room', async () => {
      await owner.get(`/nodes/${contract.id}`).expect(200);
      await owner.patch(`/nodes/${contract.id}`, { name: 'renamed.pdf' }).expect(200);
    });
  });

  describe('a stranger', () => {
    it('cannot see the room', async () => {
      await stranger.get(`/data-rooms/${roomId}`).expect(404);
    });

    it('cannot see a node inside it', async () => {
      await stranger.get(`/nodes/${contract.id}`).expect(404);
    });

    it('cannot list a folder inside it', async () => {
      await stranger.get(`/data-rooms/${roomId}/nodes?parentId=${legal.id}`).expect(404);
    });

    it('is told the item is missing rather than forbidden, so existence stays hidden', async () => {
      const response = await stranger.get(`/nodes/${contract.id}`);

      expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('a recipient of a folder share', () => {
    beforeEach(async () => {
      await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'RESTRICTED',
        emails: [guest.email],
      });
    });

    it('reads the shared folder', async () => {
      await guest.get(`/nodes/${legal.id}`).expect(200);
    });

    it('reads a node nested below it', async () => {
      await guest.get(`/nodes/${contract.id}`).expect(200);
    });

    it('does not see a sibling folder', async () => {
      await guest.get(`/nodes/${financials.id}`).expect(404);
    });

    it('does not see the room root', async () => {
      await guest.get(`/data-rooms/${roomId}/nodes`).expect(404);
    });

    it('cannot write inside the shared folder', async () => {
      await guest.patch(`/nodes/${contract.id}`, { name: 'hacked.pdf' }).expect(403);
    });

    it('cannot delete the shared folder', async () => {
      await guest.delete(`/nodes/${legal.id}`).expect(403);
    });

    it('cannot upload into it', async () => {
      await guest
        .post(`/data-rooms/${roomId}/uploads`, {
          parentId: contracts.id,
          files: [{ name: 'x.pdf', size: 10, mimeType: 'application/pdf' }],
        })
        .expect(403);
    });

    it('sees it under shared-with-me', async () => {
      const response = await guest.get('/shared-with-me').expect(200);

      expect(response.body).toEqual([expect.objectContaining({ name: 'Legal', type: 'FOLDER' })]);
    });

    it('reaches content only through the share, so a sibling stays unreachable', async () => {
      const nested = await owner.get(`/nodes/${contracts.id}`).expect(200);

      expect(nested.body.breadcrumbs).toHaveLength(1);
      await guest.get(`/nodes/${financials.id}`).expect(404);
    });
  });

  describe('a recipient invited before signing up', () => {
    it('gains access once the account exists', async () => {
      await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'RESTRICTED',
        emails: ['newcomer@acme.test'],
      });

      const newcomer = await harness.signUp('newcomer@acme.test');

      await newcomer.get(`/nodes/${legal.id}`).expect(200);
    });
  });

  describe('a public link', () => {
    it('opens the shared subtree without a session', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
      });
      const token = tokenOf(share);
      const visitor = harness.anonymous();

      await visitor.get(`/public/shares/${token}`).expect(200);
      await visitor.get(`/public/shares/${token}/nodes/${contract.id}`).expect(200);
    });

    it('does not open a sibling outside the shared subtree', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
      });
      const visitor = harness.anonymous();

      await visitor
        .get(`/public/shares/${tokenOf(share)}/nodes/${financials.id}`)
        .expect(404);
    });

    it('is refused with a wrong token', async () => {
      await createShare(owner, { dataRoomId: roomId, nodeId: legal.id, type: 'PUBLIC_LINK' });

      await harness.anonymous().get('/public/shares/not-a-real-token').expect(404);
    });

    it('does not grant access to the private endpoints', async () => {
      const share = await createShare(owner, {
        dataRoomId: roomId,
        nodeId: legal.id,
        type: 'PUBLIC_LINK',
      });

      await harness.anonymous().get(`/nodes/${legal.id}`, tokenOf(share)).expect(401);
    });
  });

  describe('a room-wide share', () => {
    it('covers every folder in the room', async () => {
      await createShare(owner, {
        dataRoomId: roomId,
        nodeId: null,
        type: 'RESTRICTED',
        emails: [guest.email],
      });

      await guest.get(`/data-rooms/${roomId}/nodes`).expect(200);
      await guest.get(`/nodes/${financials.id}`).expect(200);
      await guest.get(`/nodes/${contract.id}`).expect(200);
    });

    it('covers content created after it was granted', async () => {
      await createShare(owner, {
        dataRoomId: roomId,
        nodeId: null,
        type: 'RESTRICTED',
        emails: [guest.email],
      });

      const later = await createFolder(owner, roomId, 'Added later');

      await guest.get(`/nodes/${later.id}`).expect(200);
    });
  });

  describe('an unauthenticated caller', () => {
    it('is rejected on private endpoints', async () => {
      await harness.anonymous().get('/data-rooms').expect(401);
      await harness.anonymous().get(`/nodes/${contract.id}`).expect(401);
    });
  });
});
