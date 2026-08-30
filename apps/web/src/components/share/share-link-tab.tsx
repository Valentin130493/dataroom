'use client';

import { useState } from 'react';
import { Check, Copy, Globe, Link2Off } from 'lucide-react';
import { ShareRole, ShareType, type ShareSummary } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateShare, useRevokeShare } from '@/hooks/use-shares';

interface ShareLinkTabProps {
  dataRoomId: string;
  nodeId: string | null;
  shares: ShareSummary[];
}

export function ShareLinkTab({ dataRoomId, nodeId, shares }: ShareLinkTabProps) {
  const [isCopied, setIsCopied] = useState(false);

  const publicShare = shares.find((share) => share.type === ShareType.PUBLIC_LINK);
  const createShare = useCreateShare(dataRoomId, nodeId);
  const revokeShare = useRevokeShare(dataRoomId, nodeId);

  const copy = async () => {
    if (!publicShare?.url) {
      return;
    }

    await navigator.clipboard.writeText(publicShare.url);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2000);
  };

  if (!publicShare) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Globe className="size-4" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">No public link yet</p>
          <p className="text-sm text-muted-foreground">
            Anyone with the link will be able to view this item, without signing in.
          </p>
        </div>
        <Button
          disabled={createShare.isPending}
          onClick={() =>
            createShare.mutate({
              dataRoomId,
              nodeId,
              type: ShareType.PUBLIC_LINK,
              role: ShareRole.VIEWER,
              emails: [],
              expiresAt: null,
            })
          }
        >
          Create public link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Anyone with this link can view this item and everything inside it. Revoking the link breaks
        it immediately.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={publicShare.url ?? ''}
          aria-label="Public link"
          className="min-w-0 flex-1 font-mono text-xs"
        />
        <Button variant="outline" className="shrink-0" onClick={copy}>
          {isCopied ? <Check /> : <Copy />}
          {isCopied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <Button
        variant="destructive"
        disabled={revokeShare.isPending}
        onClick={() => revokeShare.mutate(publicShare.id)}
      >
        <Link2Off />
        Revoke link
      </Button>
    </div>
  );
}
