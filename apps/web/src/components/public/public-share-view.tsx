'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderLock, FolderOpen, Loader2 } from 'lucide-react';
import { NodeType, type NodeSummary } from '@dataroom/shared';
import { EmptyState } from '@/components/common/empty-state';
import { ExplorerBreadcrumbs } from '@/components/explorer/explorer-breadcrumbs';
import type { PreviewTarget } from '@/components/explorer/file-preview';
import { NodeTable } from '@/components/explorer/node-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogRef } from '@/hooks/use-dialog';
import { DEFAULT_SORT, type SortState } from '@/hooks/use-nodes';
import {
  usePublicContentUrl,
  usePublicNode,
  usePublicNodes,
  usePublicShare,
} from '@/hooks/use-public-share';
import { ApiError } from '@/lib/api/http';
import { formatBytes, pluralize } from '@/lib/format';
import { PublicFilePreviewDialog } from './public-file-preview-dialog';
import { PublicShareError } from './public-share-error';

interface PublicShareViewProps {
  token: string;
  folderId: string | null;
}

export function PublicShareView({ token, folderId }: PublicShareViewProps) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const previewRef = useDialogRef<PreviewTarget>();

  const share = usePublicShare(token);
  const scopeId = folderId ?? share.data?.rootNodeId ?? null;
  const scope = usePublicNode(token, scopeId);

  const isFileShare = scope.data?.type === NodeType.FILE;
  const list = usePublicNodes(token, scopeId, share.isSuccess && !isFileShare, sort);

  const buildHref = useCallback(
    (nodeId: string | null) => (nodeId ? `/s/${token}/f/${nodeId}` : `/s/${token}`),
    [token],
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

  if (share.error instanceof ApiError) {
    return <PublicShareError error={share.error} />;
  }

  if (scope.error instanceof ApiError && scope.error.isMissing) {
    return <PublicShareError error={scope.error} backHref={buildHref(null)} />;
  }

  if (share.isPending || !share.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nodes = list.data?.pages.flatMap((page) => page.items) ?? [];
  const stats = scope.data?.stats;
  const rootLabel = share.data.rootName;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderLock className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Shared with you</p>
          <h1 className="truncate text-lg font-semibold tracking-tight">{rootLabel}</h1>
        </div>

        <Badge variant="secondary">Read-only</Badge>
      </header>

      {isFileShare && scope.data ? (
        <PublicFileView token={token} node={scope.data} />
      ) : (
        <>
          <div className="space-y-1">
            {scope.isPending && scopeId ? (
              <Skeleton className="h-5 w-56" />
            ) : (
              <ExplorerBreadcrumbs
                rootLabel={rootLabel}
                trail={folderId ? (scope.data?.breadcrumbs ?? []) : []}
                currentName={folderId ? (scope.data?.name ?? null) : null}
                buildHref={buildHref}
              />
            )}

            {stats ? (
              <p className="text-sm text-muted-foreground">
                {pluralize(stats.folderCount, 'folder')} · {pluralize(stats.fileCount, 'file')} ·{' '}
                {formatBytes(stats.totalSize)}
              </p>
            ) : null}
          </div>

          {!list.isPending && nodes.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Nothing here yet"
              description="This folder does not contain any documents."
            />
          ) : (
            <NodeTable
              nodes={nodes}
              actions={{}}
              sort={sort}
              onSortChange={setSort}
              onOpen={openNode}
              isLoading={list.isPending}
              hasMore={Boolean(list.hasNextPage)}
              isLoadingMore={list.isFetchingNextPage}
              onLoadMore={() => void list.fetchNextPage()}
            />
          )}
        </>
      )}

      <PublicFilePreviewDialog ref={previewRef} token={token} />
    </main>
  );
}

function PublicFileView({ token, node }: { token: string; node: NodeSummary }) {
  const content = usePublicContentUrl(token, node.id);

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="truncate text-sm font-medium">{node.name}</p>
        <p className="shrink-0 text-xs text-muted-foreground">{formatBytes(node.size)}</p>
      </div>

      <div className="h-[75vh] bg-muted/40">
        {content.isPending ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : content.data ? (
          <iframe src={content.data.url} title={node.name} className="size-full border-0" />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            The document could not be loaded.
          </p>
        )}
      </div>
    </div>
  );
}
