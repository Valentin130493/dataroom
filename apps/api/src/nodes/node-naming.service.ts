import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConflictStrategy, ErrorCode } from '@dataroom/shared';
import { DomainException } from '../common/errors/domain.exception';
import { nextAvailableName, splitName, stripCopySuffix } from './name-resolver';

export interface NameScope {
  dataRoomId: string;
  parentId: string | null;
  excludeNodeId?: string;
}

@Injectable()
export class NodeNamingService {
  async resolve(
    tx: Prisma.TransactionClient,
    scope: NameScope,
    desired: string,
    strategy: ConflictStrategy,
  ): Promise<string> {
    const taken = await this.takenNames(tx, scope, desired);

    if (!taken.some((name) => name.toLowerCase() === desired.toLowerCase())) {
      return desired;
    }

    if (strategy === ConflictStrategy.FAIL) {
      throw DomainException.conflict(
        ErrorCode.NAME_CONFLICT,
        `"${desired}" already exists in this folder`,
        { name: desired },
      );
    }

    return nextAvailableName(desired, taken);
  }

  async findConflict(
    tx: Prisma.TransactionClient,
    scope: NameScope,
    desired: string,
  ): Promise<string | null> {
    const match = await tx.node.findFirst({
      where: {
        dataRoomId: scope.dataRoomId,
        parentId: scope.parentId,
        deletedAt: null,
        name: { equals: desired, mode: 'insensitive' },
        ...(scope.excludeNodeId ? { id: { not: scope.excludeNodeId } } : {}),
      },
      select: { id: true },
    });

    return match?.id ?? null;
  }

  private async takenNames(
    tx: Prisma.TransactionClient,
    scope: NameScope,
    desired: string,
  ): Promise<string[]> {
    const { base } = splitName(desired);
    const root = stripCopySuffix(base);

    const rows = await tx.node.findMany({
      where: {
        dataRoomId: scope.dataRoomId,
        parentId: scope.parentId,
        deletedAt: null,
        name: { startsWith: root, mode: 'insensitive' },
        ...(scope.excludeNodeId ? { id: { not: scope.excludeNodeId } } : {}),
      },
      select: { name: true },
    });

    return rows.map((row) => row.name);
  }
}
