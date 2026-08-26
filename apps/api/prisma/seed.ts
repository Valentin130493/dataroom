import { NodeType, PrismaClient, ShareType } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const OWNER = { email: 'owner@acme.test', password: 'password123', name: 'Dana Owner' };
const GUEST = { email: 'guest@acme.test', password: 'password123', name: 'Sam Guest' };

async function upsertUser(profile: typeof OWNER) {
  return prisma.user.upsert({
    where: { email: profile.email },
    update: {},
    create: {
      email: profile.email,
      name: profile.name,
      passwordHash: await hash(profile.password),
    },
  });
}

async function createFolder(dataRoomId: string, createdById: string, name: string, parent?: { id: string; path: string; depth: number }) {
  return prisma.node.create({
    data: {
      dataRoomId,
      createdById,
      name,
      type: NodeType.FOLDER,
      parentId: parent?.id ?? null,
      path: parent ? `${parent.path}${parent.id}/` : '/',
      depth: parent ? parent.depth + 1 : 0,
    },
  });
}

async function main() {
  const owner = await upsertUser(OWNER);
  const guest = await upsertUser(GUEST);

  const existing = await prisma.dataRoom.findFirst({
    where: { ownerId: owner.id, name: 'Project Atlas', deletedAt: null },
  });

  if (existing) {
    console.log('Seed data already present, skipping.');
    return;
  }

  const room = await prisma.dataRoom.create({
    data: { name: 'Project Atlas', ownerId: owner.id },
  });

  const financials = await createFolder(room.id, owner.id, 'Financials');
  const legal = await createFolder(room.id, owner.id, 'Legal');
  await createFolder(room.id, owner.id, '2024', financials);
  await createFolder(room.id, owner.id, 'Contracts', legal);

  await prisma.node.update({
    where: { id: financials.id },
    data: { subtreeFolderCount: 1 },
  });

  await prisma.node.update({
    where: { id: legal.id },
    data: { subtreeFolderCount: 1 },
  });

  await prisma.share.create({
    data: {
      dataRoomId: room.id,
      nodeId: legal.id,
      type: ShareType.RESTRICTED,
      createdById: owner.id,
      recipients: { create: { email: guest.email, userId: guest.id } },
    },
  });

  console.log(`Seeded data room "${room.name}" for ${owner.email} (password: ${OWNER.password})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
