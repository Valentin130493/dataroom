import { Injectable } from '@nestjs/common';
import { Node, NodeType, Prisma } from '@prisma/client';

export interface SubtreeWeight {
  size: bigint;
  files: number;
  folders: number;
}

export const ZERO_WEIGHT: SubtreeWeight = { size: 0n, files: 0, folders: 0 };

@Injectable()
export class NodeRollupService {
  weightOf(node: Pick<Node, 'type' | 'size' | 'subtreeSize' | 'subtreeFileCount' | 'subtreeFolderCount'>): SubtreeWeight {
    if (node.type === NodeType.FILE) {
      return { size: BigInt(node.size), files: 1, folders: 0 };
    }

    return {
      size: node.subtreeSize,
      files: node.subtreeFileCount,
      folders: node.subtreeFolderCount + 1,
    };
  }

  negate(weight: SubtreeWeight): SubtreeWeight {
    return { size: -weight.size, files: -weight.files, folders: -weight.folders };
  }

  async shift(
    tx: Prisma.TransactionClient,
    ancestorIds: string[],
    weight: SubtreeWeight,
  ): Promise<void> {
    if (ancestorIds.length === 0 || this.isNoop(weight)) {
      return;
    }

    await tx.node.updateMany({
      where: { id: { in: ancestorIds } },
      data: {
        subtreeSize: { increment: weight.size },
        subtreeFileCount: { increment: weight.files },
        subtreeFolderCount: { increment: weight.folders },
      },
    });
  }

  private isNoop(weight: SubtreeWeight): boolean {
    return weight.size === 0n && weight.files === 0 && weight.folders === 0;
  }
}
