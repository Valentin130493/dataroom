import { Injectable } from '@nestjs/common';
import { DataRoom, Node, Share, ShareRecipient, ShareType } from '@prisma/client';
import { ErrorCode, Permission, ROLE_PERMISSIONS, ShareRole } from '@dataroom/shared';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ancestorIds } from '../nodes/node-path';

export interface AccessContext {
  userId?: string;
  userEmail?: string;
  shareToken?: string;
}

export interface AccessGrant {
  dataRoomId: string;
  permissions: Permission[];
  isOwner: boolean;
  shareId: string | null;
  scopeNodeId: string | null;
}

export interface NodeAccess {
  node: Node;
  grant: AccessGrant;
}

type ShareWithRecipients = Share & { recipients: ShareRecipient[] };

const OWNER_PERMISSIONS: Permission[] = [Permission.READ, Permission.WRITE, Permission.MANAGE];

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireDataRoom(
    dataRoomId: string,
    context: AccessContext,
    permission: Permission,
  ): Promise<AccessGrant> {
    const dataRoom = await this.prisma.dataRoom.findFirst({
      where: { id: dataRoomId, deletedAt: null },
    });

    if (!dataRoom) {
      throw DomainException.notFound('Data room not found');
    }

    const grant = await this.resolve(dataRoom, [], context);

    return this.assert(grant, permission);
  }

  async requireNode(
    nodeId: string,
    context: AccessContext,
    permission: Permission,
  ): Promise<NodeAccess> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { dataRoom: true },
    });

    if (!node || node.dataRoom.deletedAt) {
      throw DomainException.notFound('Item not found');
    }

    if (node.deletedAt) {
      throw DomainException.gone(ErrorCode.GONE, 'This item has been deleted');
    }

    const grant = await this.resolve(node.dataRoom, [...ancestorIds(node), node.id], context);

    return { node, grant: this.assert(grant, permission) };
  }

  async resolveShareToken(token: string): Promise<ShareWithRecipients> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { recipients: true },
    });

    if (!share || share.type !== ShareType.PUBLIC_LINK) {
      throw DomainException.notFound('Link not found');
    }

    if (share.revokedAt) {
      throw DomainException.gone(ErrorCode.SHARE_REVOKED, 'This link has been revoked');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw DomainException.gone(ErrorCode.SHARE_EXPIRED, 'This link has expired');
    }

    return share;
  }

  private async resolve(
    dataRoom: DataRoom,
    candidateNodeIds: string[],
    context: AccessContext,
  ): Promise<AccessGrant> {
    if (context.userId && context.userId === dataRoom.ownerId) {
      return {
        dataRoomId: dataRoom.id,
        permissions: OWNER_PERMISSIONS,
        isOwner: true,
        shareId: null,
        scopeNodeId: null,
      };
    }

    const share = await this.findApplicableShare(dataRoom.id, candidateNodeIds, context);

    if (!share) {
      return {
        dataRoomId: dataRoom.id,
        permissions: [],
        isOwner: false,
        shareId: null,
        scopeNodeId: null,
      };
    }

    return {
      dataRoomId: dataRoom.id,
      permissions: [...ROLE_PERMISSIONS[share.role as ShareRole]],
      isOwner: false,
      shareId: share.id,
      scopeNodeId: share.nodeId,
    };
  }

  private async findApplicableShare(
    dataRoomId: string,
    candidateNodeIds: string[],
    context: AccessContext,
  ): Promise<ShareWithRecipients | null> {
    if (!context.userId && !context.shareToken) {
      return null;
    }

    const shares = await this.prisma.share.findMany({
      where: {
        dataRoomId,
        revokedAt: null,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          { OR: [{ nodeId: null }, { nodeId: { in: candidateNodeIds } }] },
        ],
      },
      include: { recipients: true },
    });

    return shares.find((share) => this.matches(share, context)) ?? null;
  }

  private matches(share: ShareWithRecipients, context: AccessContext): boolean {
    if (share.type === ShareType.PUBLIC_LINK) {
      return Boolean(context.shareToken) && share.token === context.shareToken;
    }

    return share.recipients.some(
      (recipient) =>
        (context.userId != null && recipient.userId === context.userId) ||
        (context.userEmail != null && recipient.email === context.userEmail),
    );
  }

  private assert(grant: AccessGrant, permission: Permission): AccessGrant {
    if (!grant.permissions.includes(permission)) {
      throw grant.permissions.length === 0
        ? DomainException.notFound('Item not found')
        : DomainException.forbidden('You do not have permission to perform this action');
    }

    return grant;
  }
}
