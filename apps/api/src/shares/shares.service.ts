import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Share, ShareRecipient, ShareType } from '@prisma/client';
import {
  AddRecipientsInput,
  CreateShareInput,
  ErrorCode,
  Permission,
  PublicShareContext,
  ShareRole,
  ShareSummary,
  SharedWithMeItem,
} from '@dataroom/shared';
import { AccessContext, AccessService } from '../access/access.service';
import { DomainException } from '../common/errors/domain.exception';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

type ShareWithRecipients = Share & { recipients: ShareRecipient[] };

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(input: CreateShareInput, context: AccessContext): Promise<ShareSummary> {
    const targetName = await this.requireManageableTarget(input.dataRoomId, input.nodeId, context);

    const share = await this.prisma.share.create({
      data: {
        dataRoomId: input.dataRoomId,
        nodeId: input.nodeId,
        type: input.type,
        role: input.role,
        token: input.type === ShareType.PUBLIC_LINK ? this.newToken() : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdById: context.userId as string,
        recipients: {
          create: await this.recipientRows(input.emails),
        },
      },
      include: { recipients: true },
    });

    return this.toSummary(share, targetName);
  }

  async listForTarget(
    dataRoomId: string,
    nodeId: string | null,
    context: AccessContext,
  ): Promise<ShareSummary[]> {
    const targetName = await this.requireManageableTarget(dataRoomId, nodeId, context);

    const shares = await this.prisma.share.findMany({
      where: { dataRoomId, nodeId, revokedAt: null },
      include: { recipients: true },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((share) => this.toSummary(share, targetName));
  }

  async revoke(shareId: string, context: AccessContext): Promise<void> {
    const share = await this.loadManageable(shareId, context);

    await this.prisma.share.update({
      where: { id: share.id },
      data: { revokedAt: new Date() },
    });
  }

  async addRecipients(
    shareId: string,
    input: AddRecipientsInput,
    context: AccessContext,
  ): Promise<ShareSummary> {
    const share = await this.loadManageable(shareId, context);

    if (share.type !== ShareType.RESTRICTED) {
      throw DomainException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'Recipients can only be added to a permissioned share',
      );
    }

    await this.prisma.shareRecipient.createMany({
      data: (await this.recipientRows(input.emails)).map((row) => ({ ...row, shareId })),
      skipDuplicates: true,
    });

    return this.reload(shareId);
  }

  async removeRecipient(
    shareId: string,
    recipientId: string,
    context: AccessContext,
  ): Promise<ShareSummary> {
    await this.loadManageable(shareId, context);

    await this.prisma.shareRecipient.deleteMany({ where: { id: recipientId, shareId } });

    return this.reload(shareId);
  }

  async sharedWithMe(userId: string, email: string): Promise<SharedWithMeItem[]> {
    const shares = await this.prisma.share.findMany({
      where: {
        type: ShareType.RESTRICTED,
        revokedAt: null,
        dataRoom: { deletedAt: null },
        recipients: { some: { OR: [{ userId }, { email }] } },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        dataRoom: { include: { owner: { select: { name: true, email: true } } } },
        node: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares
      .filter((share) => !share.node || !share.node.deletedAt)
      .map((share) => ({
        shareId: share.id,
        dataRoomId: share.dataRoomId,
        nodeId: share.nodeId,
        name: share.node?.name ?? share.dataRoom.name,
        type: share.node ? (share.node.type === 'FOLDER' ? 'FOLDER' : 'FILE') : 'DATA_ROOM',
        role: share.role as ShareRole,
        ownerName: share.dataRoom.owner.name ?? share.dataRoom.owner.email,
        sharedAt: share.createdAt.toISOString(),
      }));
  }

  async publicContext(token: string): Promise<PublicShareContext> {
    const share = await this.access.resolveShareToken(token);

    const [dataRoom, node] = await Promise.all([
      this.prisma.dataRoom.findFirst({ where: { id: share.dataRoomId, deletedAt: null } }),
      share.nodeId ? this.prisma.node.findUnique({ where: { id: share.nodeId } }) : null,
    ]);

    if (!dataRoom || (share.nodeId && (!node || node.deletedAt))) {
      throw DomainException.gone(ErrorCode.GONE, 'The shared item is no longer available');
    }

    return {
      shareId: share.id,
      role: share.role as ShareRole,
      rootName: node?.name ?? dataRoom.name,
      rootNodeId: share.nodeId,
      dataRoomId: share.dataRoomId,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    };
  }

  private async reload(shareId: string): Promise<ShareSummary> {
    const share = await this.prisma.share.findUniqueOrThrow({
      where: { id: shareId },
      include: { recipients: true, node: true, dataRoom: true },
    });

    return this.toSummary(share, share.node?.name ?? share.dataRoom.name);
  }

  private async loadManageable(
    shareId: string,
    context: AccessContext,
  ): Promise<ShareWithRecipients> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { recipients: true },
    });

    if (!share) {
      throw DomainException.notFound('Share not found');
    }

    await this.access.requireDataRoom(share.dataRoomId, context, Permission.MANAGE);

    return share;
  }

  private async requireManageableTarget(
    dataRoomId: string,
    nodeId: string | null,
    context: AccessContext,
  ): Promise<string> {
    if (!nodeId) {
      await this.access.requireDataRoom(dataRoomId, context, Permission.MANAGE);
      const room = await this.prisma.dataRoom.findUniqueOrThrow({ where: { id: dataRoomId } });

      return room.name;
    }

    const { node } = await this.access.requireNode(nodeId, context, Permission.MANAGE);

    if (node.dataRoomId !== dataRoomId) {
      throw DomainException.notFound('Item not found');
    }

    return node.name;
  }

  private async recipientRows(
    emails: string[],
  ): Promise<{ email: string; userId: string | null }[]> {
    if (emails.length === 0) {
      return [];
    }

    const unique = [...new Set(emails.map((email) => email.toLowerCase()))];

    const users = await this.prisma.user.findMany({
      where: { email: { in: unique } },
      select: { id: true, email: true },
    });

    const byEmail = new Map(users.map((user) => [user.email, user.id]));

    return unique.map((email) => ({ email, userId: byEmail.get(email) ?? null }));
  }

  private toSummary(share: ShareWithRecipients, targetName: string): ShareSummary {
    return {
      id: share.id,
      dataRoomId: share.dataRoomId,
      nodeId: share.nodeId,
      targetName,
      type: share.type,
      role: share.role as ShareRole,
      url: share.token
        ? `${this.config.get('WEB_APP_URL', { infer: true })}/s/${share.token}`
        : null,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
      recipients: share.recipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        userId: recipient.userId,
        hasAccepted: recipient.acceptedAt !== null,
        invitedAt: recipient.invitedAt.toISOString(),
      })),
    };
  }

  private newToken(): string {
    return randomBytes(24).toString('base64url');
  }
}
