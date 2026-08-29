import { Inject, Injectable } from '@nestjs/common';
import { Node, NodeType, Prisma, UploadStatus } from '@prisma/client';
import {
  ConfirmUploadInput,
  ConflictStrategy,
  ErrorCode,
  InitUploadInput,
  NodeSummary,
  Permission,
  SIGNED_UPLOAD_TTL_SECONDS,
  STORAGE_QUOTA_BYTES,
  StorageUsage,
  UploadTicket,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { DomainException } from '../common/errors/domain.exception';
import { NodeNamingService } from '../nodes/node-naming.service';
import { NodeRollupService } from '../nodes/node-rollup.service';
import { NodesService } from '../nodes/nodes.service';
import { ancestorIds } from '../nodes/node-path';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage.provider';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodes: NodesService,
    private readonly naming: NodeNamingService,
    private readonly rollup: NodeRollupService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async init(
    dataRoomId: string,
    input: InitUploadInput,
    context: AccessContext,
  ): Promise<UploadTicket[]> {
    await this.nodes.resolveParent(dataRoomId, input.parentId, context, Permission.WRITE);
    await this.assertFitsQuota(input.files.reduce((total, file) => total + file.size, 0));

    const userId = this.requireUserId(context);
    const expiresAt = new Date(Date.now() + SIGNED_UPLOAD_TTL_SECONDS * 1000);

    return Promise.all(
      input.files.map(async (file) => {
        const storageKey = this.storage.buildKey(dataRoomId, file.name);

        const upload = await this.prisma.upload.create({
          data: {
            dataRoomId,
            parentId: input.parentId,
            userId,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
            storageKey,
            expiresAt,
          },
        });

        const signed = await this.storage.createSignedUpload(storageKey, file.mimeType);

        return {
          uploadId: upload.id,
          name: file.name,
          storageKey,
          uploadUrl: signed.uploadUrl,
          method: signed.method,
          headers: signed.headers,
          expiresAt: signed.expiresAt.toISOString(),
        };
      }),
    );
  }

  async confirm(input: ConfirmUploadInput, context: AccessContext): Promise<NodeSummary> {
    const userId = this.requireUserId(context);
    const upload = await this.prisma.upload.findFirst({
      where: { id: input.uploadId, userId, status: UploadStatus.PENDING },
    });

    if (!upload) {
      throw DomainException.notFound('Upload session not found');
    }

    const { parent } = await this.nodes.resolveParent(
      upload.dataRoomId,
      upload.parentId,
      context,
      Permission.WRITE,
    );

    const node = await this.naming.withCollisionRetry(input.onConflict, () =>
      this.prisma.$transaction(async (tx) => {
        const existing =
          input.onConflict === ConflictStrategy.REPLACE
            ? await this.findReplaceable(tx, upload.dataRoomId, upload.parentId, upload.name)
            : null;

        const created = existing
          ? await this.addVersion(tx, existing, upload, userId)
          : await this.nodes.createFile(tx, {
              dataRoomId: upload.dataRoomId,
              parentId: upload.parentId,
              parent,
              name: await this.naming.resolve(
                tx,
                { dataRoomId: upload.dataRoomId, parentId: upload.parentId },
                upload.name,
                input.onConflict,
              ),
              size: upload.size,
              mimeType: upload.mimeType,
              storageKey: upload.storageKey,
              userId,
            });

        await tx.upload.update({
          where: { id: upload.id },
          data: { status: UploadStatus.COMPLETED, completedAt: new Date() },
        });

        return created;
      }),
    );

    return this.nodes.toSummary(node);
  }

  async abort(uploadId: string, context: AccessContext): Promise<void> {
    const userId = this.requireUserId(context);

    const upload = await this.prisma.upload.findFirst({
      where: { id: uploadId, userId, status: UploadStatus.PENDING },
    });

    if (!upload) {
      return;
    }

    await this.prisma.upload.update({
      where: { id: upload.id },
      data: { status: UploadStatus.ABORTED },
    });

    await this.storage.remove([upload.storageKey]);
  }

  private async findReplaceable(
    tx: Prisma.TransactionClient,
    dataRoomId: string,
    parentId: string | null,
    name: string,
  ): Promise<Node | null> {
    const existing = await tx.node.findFirst({
      where: {
        dataRoomId,
        parentId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existing && existing.type !== NodeType.FILE) {
      throw DomainException.conflict(
        ErrorCode.NAME_CONFLICT,
        `A folder named "${name}" already exists here`,
      );
    }

    return existing;
  }

  private async addVersion(
    tx: Prisma.TransactionClient,
    target: Node,
    upload: { size: number; mimeType: string; storageKey: string },
    userId: string,
  ): Promise<Node> {
    const version = target.currentVersion + 1;

    await tx.fileVersion.create({
      data: {
        nodeId: target.id,
        version,
        size: upload.size,
        mimeType: upload.mimeType,
        storageKey: upload.storageKey,
        createdById: userId,
      },
    });

    const updated = await tx.node.update({
      where: { id: target.id },
      data: {
        size: upload.size,
        mimeType: upload.mimeType,
        storageKey: upload.storageKey,
        currentVersion: version,
        subtreeSize: BigInt(upload.size),
      },
    });

    await this.rollup.shift(tx, ancestorIds(target), {
      size: BigInt(upload.size - target.size),
      files: 0,
      folders: 0,
    });

    return updated;
  }

  async usage(): Promise<StorageUsage> {
    const report = await this.storage.usage();

    return {
      usedBytes: report.usedBytes,
      quotaBytes: STORAGE_QUOTA_BYTES,
      objectCount: report.objectCount,
    };
  }

  private async assertFitsQuota(incomingBytes: number): Promise<void> {
    const { usedBytes } = await this.storage.usage();

    if (usedBytes + incomingBytes <= STORAGE_QUOTA_BYTES) {
      return;
    }

    throw DomainException.conflict(
      ErrorCode.STORAGE_QUOTA_EXCEEDED,
      'This upload would exceed the storage quota. Delete something first.',
      { usedBytes, quotaBytes: STORAGE_QUOTA_BYTES, incomingBytes },
    );
  }

  private requireUserId(context: AccessContext): string {
    if (!context.userId) {
      throw DomainException.unauthorized();
    }

    return context.userId;
  }
}
