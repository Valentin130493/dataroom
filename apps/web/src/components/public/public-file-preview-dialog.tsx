'use client';

import type { Ref } from 'react';
import { FilePreview, type PreviewTarget } from '@/components/explorer/file-preview';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { usePublicContentUrl } from '@/hooks/use-public-share';
import { ApiError } from '@/lib/api/http';

interface PublicFilePreviewDialogProps {
  ref: Ref<DialogHandle<PreviewTarget>>;
  token: string;
}

export function PublicFilePreviewDialog({ ref, token }: PublicFilePreviewDialogProps) {
  const { isOpen, payload: target, setOpen } = useDialog<PreviewTarget>(ref);
  const nodeId = isOpen && target ? target.id : null;
  const content = usePublicContentUrl(token, nodeId);

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
      }}
    />
  );
}
