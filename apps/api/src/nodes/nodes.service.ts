import { Inject, Injectable } from '@nestjs/common';
import { Node, NodeType, Prisma } from '@prisma/client';
import {
  BreadcrumbItem,
  ConflictStrategy,
  CreateFolderInput,
  DeletePreview,
  ErrorCode,
  FileVersionSummary,
  ListNodesQuery,
  MAX_FOLDER_DEPTH,
  MoveNodeInput,
  NodeDetails,
  NodeSummary,
  Page,
  Permission,
  RenameNodeInput,
  SearchNodesQuery,
  SignedContentUrl,
  SortDirection,
  SortField,
} from '@dataroom/shared';
import { AccessContext, AccessGrant, AccessService } from '../access/access.service';
import { DomainException } from '../common/errors/domain.exception';
import { decodeCursor, toPage } from '../common/pagination/cursor';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage.provider';
import { NodeNamingService } from './node-naming.service';
import { NodeRollupService } from './node-rollup.service';
import {
  ancestorIds,
  childDepth,
  childPath,
  isDescendantOf,
  subtreePrefix,
} from './node-path';

interface ParentContext {
  parent: Node | null;
  grant: AccessGrant;
}

@Injectable()
export class NodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly naming: NodeNamingService,
    private readonly rollup: NodeRollupService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async list(
    dataRoomId: string,
    query: ListNodesQuery,
    context: AccessContext,
  ): Promise<Page<NodeSummary>> {
    await this.resolveParent(dataRoomId, query.parentId, context, Permission.READ);

    const cursorId = decodeCursor(query.cursor);

    const rows = await this.prisma.node.findMany({
      where: {
        dataRoomId,
        parentId: query.parentId,
        deletedAt: null,
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: this.orderBy(query.sortBy, query.sortDir),
      take: query.limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    return toPage(rows, query.limit, (row) => this.toSummary(row));
  }

  async search(
    dataRoomId: string,
    query: SearchNodesQuery,
    context: AccessContext,
  ): Promise<Page<NodeSummary>> {
    const scopePrefix = await this.resolveSearchScope(dataRoomId, query.scopeId, context);
    const cursorId = decodeCursor(query.cursor);

    const rows = await this.prisma.node.findMany({
      where: {
        dataRoomId,
        deletedAt: null,
        name: { contains: query.q, mode: 'insensitive' },
        ...(query.type ? { type: query.type } : {}),
        ...(scopePrefix ? { path: { startsWith: scopePrefix } } : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    return toPage(rows, query.limit, (row) => this.toSummary(row));
  }

  async details(nodeId: string, context: AccessContext): Promise<NodeDetails> {
    const { node, grant } = await this.access.requireNode(nodeId, context, Permission.READ);

    return {
      ...this.toSummary(node),
      breadcrumbs: await this.breadcrumbs(node, grant),
      permissions: grant.permissions,
      stats:
        node.type === NodeType.FOLDER
          ? {
              fileCount: node.subtreeFileCount,
              folderCount: node.subtreeFolderCount,
              totalSize: Number(node.subtreeSize),
            }
          : null,
    };
  }

  async createFolder(
    dataRoomId: string,
    input: CreateFolderInput,
    context: AccessContext,
  ): Promise<NodeSummary> {
    const { parent } = await this.resolveParent(
      dataRoomId,
      input.parentId,
      context,
      Permission.WRITE,
    );

    this.assertDepth(childDepth(parent));

    const created = await this.naming.withCollisionRetry(ConflictStrategy.FAIL, () =>
      this.prisma.$transaction(async (tx) => {
        const name = await this.naming.resolve(
          tx,
          { dataRoomId, parentId: input.parentId },
          input.name,
          ConflictStrategy.FAIL,
        );

        const node = await tx.node.create({
          data: {
            dataRoomId,
            parentId: input.parentId,
            type: NodeType.FOLDER,
            name,
            path: childPath(parent),
            depth: childDepth(parent),
            createdById: this.requireUserId(context),
          },
        });

        await this.rollup.shift(tx, ancestorIds(node), { size: 0n, files: 0, folders: 1 });

        return node;
      }),
    );

    return this.toSummary(created);
  }

  async createFile(
    tx: Prisma.TransactionClient,
    params: {
      dataRoomId: string;
      parentId: string | null;
      parent: Node | null;
      name: string;
      size: number;
      mimeType: string;
      storageKey: string;
      userId: string;
    },
  ): Promise<Node> {
    const node = await tx.node.create({
      data: {
        dataRoomId: params.dataRoomId,
        parentId: params.parentId,
        type: NodeType.FILE,
        name: params.name,
        path: childPath(params.parent),
        depth: childDepth(params.parent),
        size: params.size,
        mimeType: params.mimeType,
        storageKey: params.storageKey,
        subtreeSize: BigInt(params.size),
        subtreeFileCount: 1,
        createdById: params.userId,
        versions: {
          create: {
            version: 1,
            size: params.size,
            mimeType: params.mimeType,
            storageKey: params.storageKey,
            createdById: params.userId,
          },
        },
      },
    });

    await this.rollup.shift(tx, ancestorIds(node), {
      size: BigInt(params.size),
      files: 1,
      folders: 0,
    });

    return node;
  }

  async rename(
    nodeId: string,
    input: RenameNodeInput,
    context: AccessContext,
  ): Promise<NodeSummary> {
    const { node } = await this.access.requireNode(nodeId, context, Permission.WRITE);

    const updated = await this.naming.withCollisionRetry(input.onConflict, () =>
      this.prisma.$transaction(async (tx) => {
        const name = await this.naming.resolve(
          tx,
          { dataRoomId: node.dataRoomId, parentId: node.parentId, excludeNodeId: node.id },
          input.name,
          input.onConflict,
        );

        return tx.node.update({ where: { id: node.id }, data: { name } });
      }),
    );

    return this.toSummary(updated);
  }

  async move(nodeId: string, input: MoveNodeInput, context: AccessContext): Promise<NodeSummary> {
    const { node } = await this.access.requireNode(nodeId, context, Permission.WRITE);
    const { parent } = await this.resolveParent(
      node.dataRoomId,
      input.parentId,
      context,
      Permission.WRITE,
    );

    this.assertMoveTarget(node, parent);
    await this.assertSubtreeFits(node, childDepth(parent));

    const updated = await this.naming.withCollisionRetry(input.onConflict, () =>
      this.prisma.$transaction(async (tx) => {
        const name = await this.naming.resolve(
          tx,
          { dataRoomId: node.dataRoomId, parentId: input.parentId, excludeNodeId: node.id },
          node.name,
          input.onConflict,
        );

        const oldPrefix = subtreePrefix(node);
        const newPath = childPath(parent);
        const newPrefix = `${newPath}${node.id}/`;
        const depthDelta = childDepth(parent) - node.depth;

        const moved = await tx.node.update({
          where: { id: node.id },
          data: { parentId: input.parentId, path: newPath, depth: childDepth(parent), name },
        });

        await this.shiftSubtree(tx, node.dataRoomId, oldPrefix, newPrefix, depthDelta);

        const weight = this.rollup.weightOf(node);
        await this.rollup.shift(tx, ancestorIds(node), this.rollup.negate(weight));
        await this.rollup.shift(tx, ancestorIds(moved), weight);

        return moved;
      }),
    );

    return this.toSummary(updated);
  }

  async deletePreview(nodeId: string, context: AccessContext): Promise<DeletePreview> {
    const { node } = await this.access.requireNode(nodeId, context, Permission.WRITE);

    if (node.type === NodeType.FILE) {
      return { fileCount: 1, folderCount: 0, totalSize: node.size };
    }

    return {
      fileCount: node.subtreeFileCount,
      folderCount: node.subtreeFolderCount,
      totalSize: Number(node.subtreeSize),
    };
  }

  async remove(nodeId: string, context: AccessContext): Promise<void> {
    const { node } = await this.access.requireNode(nodeId, context, Permission.WRITE);
    const deletedAt = new Date();

    const storageKeys = await this.prisma.$transaction(async (tx) => {
      const prefix = subtreePrefix(node);

      const files = await tx.node.findMany({
        where: {
          dataRoomId: node.dataRoomId,
          deletedAt: null,
          type: NodeType.FILE,
          OR: [{ id: node.id }, { path: { startsWith: prefix } }],
        },
        select: { storageKey: true },
      });

      await tx.node.updateMany({
        where: {
          dataRoomId: node.dataRoomId,
          deletedAt: null,
          OR: [{ id: node.id }, { path: { startsWith: prefix } }],
        },
        data: { deletedAt },
      });

      await tx.share.updateMany({
        where: { nodeId: node.id, revokedAt: null },
        data: { revokedAt: deletedAt },
      });

      await this.rollup.shift(
        tx,
        ancestorIds(node),
        this.rollup.negate(this.rollup.weightOf(node)),
      );

      return files.map((file) => file.storageKey).filter((key): key is string => Boolean(key));
    });

    await this.storage.remove(storageKeys);
  }

  async contentUrl(nodeId: string, context: AccessContext): Promise<SignedContentUrl> {
    const { node } = await this.access.requireNode(nodeId, context, Permission.READ);

    if (node.type !== NodeType.FILE || !node.storageKey) {
      throw DomainException.badRequest(ErrorCode.VALIDATION_FAILED, 'This item is not a file');
    }

    const signed = await this.storage.createSignedDownload(node.storageKey);

    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }

  async versions(nodeId: string, context: AccessContext): Promise<FileVersionSummary[]> {
    const { node } = await this.access.requireNode(nodeId, context, Permission.READ);

    const versions = await this.prisma.fileVersion.findMany({
      where: { nodeId: node.id },
      orderBy: { version: 'desc' },
      include: { createdBy: { select: { name: true, email: true } } },
    });

    return versions.map((version) => ({
      id: version.id,
      version: version.version,
      size: version.size,
      createdAt: version.createdAt.toISOString(),
      createdByName: version.createdBy.name ?? version.createdBy.email,
      isCurrent: version.version === node.currentVersion,
    }));
  }

  async resolveParent(
    dataRoomId: string,
    parentId: string | null,
    context: AccessContext,
    permission: Permission,
  ): Promise<ParentContext> {
    if (!parentId) {
      const grant = await this.access.requireDataRoom(dataRoomId, context, permission);

      if (grant.scopeNodeId) {
        throw DomainException.notFound('Folder not found');
      }

      return { parent: null, grant };
    }

    const { node, grant } = await this.access.requireNode(parentId, context, permission);

    if (node.dataRoomId !== dataRoomId || node.type !== NodeType.FOLDER) {
      throw DomainException.notFound('Folder not found');
    }

    return { parent: node, grant };
  }

  toSummary(node: Node): NodeSummary {
    return {
      id: node.id,
      dataRoomId: node.dataRoomId,
      parentId: node.parentId,
      type: node.type,
      name: node.name,
      size: node.type === NodeType.FILE ? node.size : Number(node.subtreeSize),
      mimeType: node.mimeType,
      version: node.currentVersion,
      updatedAt: node.updatedAt.toISOString(),
      createdAt: node.createdAt.toISOString(),
    };
  }

  private async breadcrumbs(node: Node, grant: AccessGrant): Promise<BreadcrumbItem[]> {
    const ids = ancestorIds(node);

    if (ids.length === 0) {
      return [];
    }

    const ancestors = await this.prisma.node.findMany({
      where: { id: { in: ids } },
      orderBy: { depth: 'asc' },
      select: { id: true, name: true },
    });

    if (!grant.scopeNodeId) {
      return ancestors;
    }

    const scopeIndex = ancestors.findIndex((item) => item.id === grant.scopeNodeId);

    return scopeIndex === -1 ? [] : ancestors.slice(scopeIndex);
  }

  private async resolveSearchScope(
    dataRoomId: string,
    scopeId: string | undefined,
    context: AccessContext,
  ): Promise<string | null> {
    if (scopeId) {
      const { node } = await this.access.requireNode(scopeId, context, Permission.READ);
      return subtreePrefix(node);
    }

    const grant = await this.access.requireDataRoom(dataRoomId, context, Permission.READ);

    if (!grant.scopeNodeId) {
      return null;
    }

    const scope = await this.prisma.node.findUnique({ where: { id: grant.scopeNodeId } });

    return scope ? subtreePrefix(scope) : null;
  }

  private async shiftSubtree(
    tx: Prisma.TransactionClient,
    dataRoomId: string,
    oldPrefix: string,
    newPrefix: string,
    depthDelta: number,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE "Node"
      SET "path" = ${newPrefix} || substring("path" from ${oldPrefix.length + 1}::int),
          "depth" = "depth" + ${depthDelta}::int
      WHERE "dataRoomId" = ${dataRoomId}::uuid
        AND "path" LIKE ${`${oldPrefix}%`}
    `;
  }

  private assertMoveTarget(node: Node, parent: Node | null): void {
    if (!parent) {
      return;
    }

    if (parent.id === node.id || isDescendantOf(parent, node)) {
      throw DomainException.unprocessable(
        ErrorCode.INVALID_MOVE_TARGET,
        'A folder cannot be moved inside itself',
      );
    }
  }

  private async assertSubtreeFits(node: Node, newDepth: number): Promise<void> {
    const deepest = await this.prisma.node.aggregate({
      where: {
        dataRoomId: node.dataRoomId,
        deletedAt: null,
        path: { startsWith: subtreePrefix(node) },
      },
      _max: { depth: true },
    });

    const height = (deepest._max.depth ?? node.depth) - node.depth;

    this.assertDepth(newDepth + height);
  }

  private assertDepth(depth: number): void {
    if (depth > MAX_FOLDER_DEPTH) {
      throw DomainException.unprocessable(
        ErrorCode.DEPTH_LIMIT_EXCEEDED,
        `Folders cannot be nested deeper than ${MAX_FOLDER_DEPTH} levels`,
      );
    }
  }

  private requireUserId(context: AccessContext): string {
    if (!context.userId) {
      throw DomainException.unauthorized();
    }

    return context.userId;
  }

  private orderBy(
    sortBy: SortField,
    sortDir: SortDirection,
  ): Prisma.NodeOrderByWithRelationInput[] {
    const primary: Prisma.NodeOrderByWithRelationInput =
      sortBy === SortField.SIZE
        ? { size: sortDir }
        : sortBy === SortField.UPDATED_AT
          ? { updatedAt: sortDir }
          : { name: sortDir };

    return [{ type: 'asc' }, primary, { id: 'asc' }];
  }
}
