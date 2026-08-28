'use client';

import { useEffect, useState, type Ref } from 'react';
import { ConflictStrategy, NodeType, type NodeSummary } from '@dataroom/shared';
import { ResponsiveDialog } from '@/components/common/responsive-dialog';
import { Button } from '@/components/ui/button';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { useMoveNode } from '@/hooks/use-nodes';
import { FolderPicker } from './folder-picker';

interface MoveNodeDialogProps {
  ref: Ref<DialogHandle<NodeSummary>>;
  dataRoomId: string;
  rootLabel: string;
}

export function MoveNodeDialog({ ref, dataRoomId, rootLabel }: MoveNodeDialogProps) {
  const { isOpen, payload: node, setOpen, close } = useDialog<NodeSummary>(ref);
  const [target, setTarget] = useState<string | null>(null);
  const move = useMoveNode(dataRoomId);

  useEffect(() => {
    if (isOpen) {
      setTarget(null);
    }
  }, [isOpen]);

  if (!node) {
    return null;
  }

  const isSamePlace = target === node.parentId;

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={setOpen}
      title={`Move “${node.name}”`}
      description="Pick the folder to move it into. A name clash keeps both copies."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={move.isPending || isSamePlace}
            onClick={() =>
              move.mutate(
                { id: node.id, input: { parentId: target, onConflict: ConflictStrategy.KEEP_BOTH } },
                { onSuccess: close },
              )
            }
          >
            {isSamePlace ? 'Already here' : 'Move here'}
          </Button>
        </>
      }
    >
      <FolderPicker
        dataRoomId={dataRoomId}
        rootLabel={rootLabel}
        disabledIds={node.type === NodeType.FOLDER ? [node.id] : []}
        value={target}
        onChange={setTarget}
      />
    </ResponsiveDialog>
  );
}
