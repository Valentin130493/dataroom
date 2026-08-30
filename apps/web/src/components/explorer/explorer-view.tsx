'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { FolderOpen, UploadCloud } from 'lucide-react';
import {
  ConflictStrategy,
  MIME_EXTENSIONS,
  NodeType,
  type ConflictStrategy as ConflictStrategyType,
  type NodeSummary,
} from '@dataroom/shared';
import { EmptyState } from '@/components/common/empty-state';
import { NameDialog } from '@/components/common/name-dialog';
import { ShareDialog, type ShareTarget } from '@/components/share/share-dialog';
import { UploadConflictDialog, type UploadConflict } from '@/components/uploads/upload-conflict-dialog';
import { useUploads } from '@/components/uploads/uploads-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBreadcrumbTrail } from '@/hooks/use-breadcrumb-trail';
import { useDialogRef } from '@/hooks/use-dialog';
import { useDataRoom } from '@/hooks/use-data-rooms';
import {
  DEFAULT_SORT,
  useCreateFolder,
  useNodeDetails,
  useNodeList,
  useRenameNode,
  type SortState,
} from '@/hooks/use-nodes';
import { ApiError } from '@/lib/api/http';
import { formatBytes, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DeleteNodeDialog } from './delete-node-dialog';
import { ExplorerBreadcrumbs } from './explorer-breadcrumbs';
import { ExplorerToolbar } from './explorer-toolbar';
import type { PreviewTarget } from './file-preview';
import { GoneState } from './gone-state';
import { MoveNodeDialog } from './move-node-dialog';
import { NodeTable } from './node-table';
import { OwnerFilePreviewDialog } from './owner-file-preview-dialog';
import { SearchCommand } from './search-command';

interface ExplorerViewProps {
  dataRoomId: string;
  folderId: string | null;
}

export function ExplorerView({ dataRoomId, folderId }: ExplorerViewProps) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [renaming, setRenaming] = useState<NodeSummary | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const shareRef = useDialogRef<ShareTarget>();
  const moveRef = useDialogRef<NodeSummary>();
  const deleteRef = useDialogRef<NodeSummary>();
  const previewRef = useDialogRef<PreviewTarget>();
  const conflictRef = useDialogRef<UploadConflict>();
  const searchRef = useDialogRef<void>();

  const room = useDataRoom(dataRoomId);
  const details = useNodeDetails(folderId);
  const list = useNodeList(dataRoomId, folderId, sort);
  const trail = useBreadcrumbTrail(dataRoomId, folderId, details.data);

  const createFolder = useCreateFolder(dataRoomId);
  const renameNode = useRenameNode(dataRoomId);
  const { enqueue } = useUploads();

  const nodes = list.data?.pages.flatMap((page) => page.items) ?? [];
  const roomName = room.data?.name ?? 'Data room';

  const buildHref = useCallback(
    (nodeId: string | null) =>
      nodeId ? `/rooms/${dataRoomId}/f/${nodeId}` : `/rooms/${dataRoomId}`,
    [dataRoomId],
  );

  const startUpload = useCallback(
    (files: File[], strategy: ConflictStrategyType) => {
      void enqueue({ dataRoomId, parentId: folderId, files, onConflict: strategy });
    },
    [dataRoomId, enqueue, folderId],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const existing = new Set(
        nodes.filter((node) => node.type === NodeType.FILE).map((node) => node.name.toLowerCase()),
      );
      const conflicting = files
        .filter((file) => existing.has(file.name.toLowerCase()))
        .map((file) => file.name);

      if (conflicting.length > 0) {
        conflictRef.current?.open({ files, conflicting });
        return;
      }

      startUpload(files, ConflictStrategy.KEEP_BOTH);
    },
    [conflictRef, nodes, startUpload],
  );

  const openNode = useCallback(
    (node: NodeSummary) => {
      if (node.type === NodeType.FOLDER) {
        router.push(buildHref(node.id));
        return;
      }

      previewRef.current?.open(node);
    },
    [buildHref, previewRef, router],
  );

  const dropzone = useDropzone({
    noClick: true,
    noKeyboard: true,
    accept: MIME_EXTENSIONS,
    onDrop: handleFiles,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.open();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchRef]);

  if (details.error instanceof ApiError && details.error.isMissing) {
    return (
      <GoneState
        title="This folder is no longer available"
        description="It was deleted or your access to it was revoked."
        backHref={buildHref(null)}
        backLabel="Back to the data room"
      />
    );
  }

  if (room.error instanceof ApiError && room.error.isMissing) {
    return (
      <GoneState
        title="This data room is no longer available"
        description="It was deleted or your access to it was revoked."
        backHref="/rooms"
        backLabel="Back to my data rooms"
      />
    );
  }

  const stats = details.data?.stats;

  return (
    <section {...dropzone.getRootProps({ className: 'relative space-y-4' })}>
      <input {...dropzone.getInputProps()} />

      <div className="space-y-1">
        {room.isPending && !trail.currentName ? (
          <Skeleton className="h-5 w-56" />
        ) : (
          <ExplorerBreadcrumbs
            rootLabel={roomName}
            trail={trail.trail}
            currentName={trail.currentName}
            isStale={trail.isStale}
            buildHref={buildHref}
          />
        )}

        <p className="text-sm text-muted-foreground">
          {stats
            ? `${pluralize(stats.folderCount, 'folder')} · ${pluralize(stats.fileCount, 'file')} · ${formatBytes(stats.totalSize)}`
            : room.data
              ? `${pluralize(room.data.fileCount, 'file')} · ${formatBytes(room.data.totalSize)}`
              : ' '}
        </p>
      </div>

      <ExplorerToolbar
        onCreateFolder={() => setIsCreatingFolder(true)}
        onUpload={handleFiles}
        onShare={() =>
          shareRef.current?.open({
            dataRoomId,
            nodeId: folderId,
            name: trail.currentName ?? roomName,
          })
        }
        onSearch={() => searchRef.current?.open()}
      />

      {!list.isPending && nodes.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="This folder is empty"
          description="Drag documents here, or use the Upload button to add the first ones."
          action={
            <Button variant="outline" onClick={() => setIsCreatingFolder(true)}>
              Create a folder
            </Button>
          }
        />
      ) : (
        <NodeTable
          nodes={nodes}
          sort={sort}
          onSortChange={setSort}
          onOpen={openNode}
          isLoading={list.isPending}
          hasMore={Boolean(list.hasNextPage)}
          isLoadingMore={list.isFetchingNextPage}
          onLoadMore={() => void list.fetchNextPage()}
          actions={{
            onRename: setRenaming,
            onMove: (node) => moveRef.current?.open(node),
            onShare: (node) =>
              shareRef.current?.open({ dataRoomId, nodeId: node.id, name: node.name }),
            onDelete: (node) => deleteRef.current?.open(node),
            onDownload: (node) => previewRef.current?.open(node),
          }}
        />
      )}

      {dropzone.isDragActive ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2',
            'rounded-xl border-2 border-dashed border-primary bg-background/85 backdrop-blur-sm',
          )}
        >
          <UploadCloud className="size-6 text-primary" />
          <p className="font-medium">Drop files to upload</p>
          <p className="text-sm text-muted-foreground">
            into {trail.currentName ?? roomName}
          </p>
        </div>
      ) : null}

      <NameDialog
        open={isCreatingFolder}
        onOpenChange={setIsCreatingFolder}
        title="New folder"
        label="Folder name"
        submitLabel="Create"
        isPending={createFolder.isPending}
        onSubmit={(name) =>
          createFolder.mutate(
            { parentId: folderId, name },
            { onSuccess: () => setIsCreatingFolder(false) },
          )
        }
      />

      <NameDialog
        open={renaming !== null}
        onOpenChange={(open) => (open ? undefined : setRenaming(null))}
        title={renaming?.type === NodeType.FOLDER ? 'Rename folder' : 'Rename file'}
        label="Name"
        initialValue={renaming?.name ?? ''}
        submitLabel="Save"
        isPending={renameNode.isPending}
        onSubmit={(name) =>
          renaming
            ? renameNode.mutate(
                { id: renaming.id, input: { name, onConflict: ConflictStrategy.FAIL } },
                { onSuccess: () => setRenaming(null) },
              )
            : undefined
        }
      />

      <MoveNodeDialog ref={moveRef} dataRoomId={dataRoomId} rootLabel={roomName} />
      <DeleteNodeDialog ref={deleteRef} dataRoomId={dataRoomId} />
      <ShareDialog ref={shareRef} />
      <OwnerFilePreviewDialog ref={previewRef} />
      <UploadConflictDialog ref={conflictRef} onResolve={startUpload} />
      <SearchCommand ref={searchRef} dataRoomId={dataRoomId} onSelect={openNode} />
    </section>
  );
}
