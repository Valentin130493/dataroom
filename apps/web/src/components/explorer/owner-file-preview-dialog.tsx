'use client';

import type { Ref } from 'react';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { useNodeContentUrl, useNodeVersions } from '@/hooks/use-nodes';
import { ApiError } from '@/lib/api/http';
import { FilePreview, type PreviewTarget } from './file-preview';

export function OwnerFilePreviewDialog({ ref }: { ref: Ref<DialogHandle<PreviewTarget>> }) {
  const { isOpen, payload: target, setOpen } = useDialog<PreviewTarget>(ref);
  const nodeId = isOpen && target ? target.id : null;

  const content = useNodeContentUrl(nodeId);
  const versions = useNodeVersions(nodeId);

  if (!target) {
    return null;
  }

  return (
    <FilePreview
      isOpen={isOpen}
      onOpenChange={setOpen}
      target={target}
      source={{
        url: content.data?.url,
        isLoading: content.isPending && Boolean(nodeId),
        isUnavailable: content.error instanceof ApiError && content.error.isMissing,
        versions: versions.data,
      }}
    />
  );
}
