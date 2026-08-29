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

const UNIQUE_VIOLATION = 'P2002';
const MAX_ATTEMPTS = 4;

function isNameCollision(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

@Injectable()
export class NodeNamingService {
  async withCollisionRetry<T>(strategy: ConflictStrategy, write: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await write();
      } catch (error) {
        if (!isNameCollision(error)) {
          throw error;
        }

        if (strategy === ConflictStrategy.FAIL) {
          throw DomainException.conflict(
            ErrorCode.NAME_CONFLICT,
            'Another item with this name already exists in this folder',
          );
        }

        if (attempt >= MAX_ATTEMPTS) {
          throw DomainException.conflict(
            ErrorCode.NAME_CONFLICT,
            'Could not find a free name for this item, please try again',
          );
        }
      }
    }
  }

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
