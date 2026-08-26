'use client';

import type { Ref } from 'react';
import { NodeType, type NodeSummary } from '@dataroom/shared';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { useDeleteNode, useDeletePreview } from '@/hooks/use-nodes';
import { formatBytes, pluralize } from '@/lib/format';

interface DeleteNodeDialogProps {
  ref: Ref<DialogHandle<NodeSummary>>;
  dataRoomId: string;
  onDeleted?: (node: NodeSummary) => void;
}

export function DeleteNodeDialog({ ref, dataRoomId, onDeleted }: DeleteNodeDialogProps) {
  const { isOpen, payload: node, setOpen, close } = useDialog<NodeSummary>(ref);
  const { data: preview, isPending } = useDeletePreview(isOpen && node ? node.id : null);
  const remove = useDeleteNode(dataRoomId);

  if (!node) {
    return null;
  }

  const isFolder = node.type === NodeType.FOLDER;

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={setOpen}
      title={isFolder ? 'Delete this folder?' : 'Delete this file?'}
      description={
        <>
          <p>
            <strong className="text-foreground">{node.name}</strong>
            {isFolder ? ' and everything inside it will be deleted.' : ' will be deleted.'}
          </p>

          {isFolder ? (
            isPending ? (
              <Skeleton className="h-4 w-48" />
            ) : preview ? (
              <p>
                That is {pluralize(preview.folderCount, 'folder')} and{' '}
                {pluralize(preview.fileCount, 'file')} · {formatBytes(preview.totalSize)}.
              </p>
            ) : null
          ) : null}

          <p>Anyone this item was shared with loses access immediately.</p>
        </>
      }
      confirmLabel={isFolder ? 'Delete folder' : 'Delete file'}
      isPending={remove.isPending}
      onConfirm={() =>
        remove.mutate(
          { id: node.id, name: node.name },
          {
            onSuccess: () => {
              close();
              onDeleted?.(node);
            },
          },
        )
      }
    />
  );
}
