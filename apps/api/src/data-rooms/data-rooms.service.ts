import { Injectable } from '@nestjs/common';
import { DataRoom } from '@prisma/client';
import {
  CreateDataRoomInput,
  DataRoomSummary,
  Permission,
  RenameDataRoomInput,
} from '@dataroom/shared';
import { AccessContext, AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';

interface RoomTotals {
  fileCount: number;
  totalSize: number;
}

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async listOwned(userId: string): Promise<DataRoomSummary[]> {
    const rooms = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    const totals = await this.totalsFor(rooms.map((room) => room.id));

    return rooms.map((room) => this.toSummary(room, userId, totals.get(room.id)));
  }

  async create(userId: string, input: CreateDataRoomInput): Promise<DataRoomSummary> {
    const room = await this.prisma.dataRoom.create({
      data: { name: input.name, ownerId: userId },
    });

    return this.toSummary(room, userId, undefined);
  }

  async get(dataRoomId: string, context: AccessContext): Promise<DataRoomSummary> {
    const grant = await this.access.requireDataRoom(dataRoomId, context, Permission.READ);
    const room = await this.prisma.dataRoom.findUniqueOrThrow({ where: { id: grant.dataRoomId } });
    const totals = await this.totalsFor([room.id]);

    return this.toSummary(room, context.userId, totals.get(room.id));
  }

  async rename(
    dataRoomId: string,
    input: RenameDataRoomInput,
    context: AccessContext,
  ): Promise<DataRoomSummary> {
    await this.access.requireDataRoom(dataRoomId, context, Permission.MANAGE);

    const room = await this.prisma.dataRoom.update({
      where: { id: dataRoomId },
      data: { name: input.name },
    });

    const totals = await this.totalsFor([room.id]);

    return this.toSummary(room, context.userId, totals.get(room.id));
  }

  async remove(dataRoomId: string, context: AccessContext): Promise<void> {
    await this.access.requireDataRoom(dataRoomId, context, Permission.MANAGE);

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.dataRoom.update({ where: { id: dataRoomId }, data: { deletedAt } }),
      this.prisma.share.updateMany({
        where: { dataRoomId, revokedAt: null },
        data: { revokedAt: deletedAt },
      }),
    ]);
  }

  private async totalsFor(dataRoomIds: string[]): Promise<Map<string, RoomTotals>> {
    if (dataRoomIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.node.groupBy({
      by: ['dataRoomId'],
      where: { dataRoomId: { in: dataRoomIds }, parentId: null, deletedAt: null },
      _sum: { subtreeSize: true, subtreeFileCount: true },
    });

    return new Map(
      grouped.map((row) => [
        row.dataRoomId,
        {
          fileCount: row._sum.subtreeFileCount ?? 0,
          totalSize: Number(row._sum.subtreeSize ?? 0n),
        },
      ]),
    );
  }

  private toSummary(
    room: DataRoom,
    userId: string | undefined,
    totals: RoomTotals | undefined,
  ): DataRoomSummary {
    return {
      id: room.id,
      name: room.name,
      ownerId: room.ownerId,
      isOwner: room.ownerId === userId,
      fileCount: totals?.fileCount ?? 0,
      totalSize: totals?.totalSize ?? 0,
      updatedAt: room.updatedAt.toISOString(),
      createdAt: room.createdAt.toISOString(),
    };
  }
}
