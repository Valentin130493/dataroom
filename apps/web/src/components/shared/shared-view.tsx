'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { NodeType, type SharedWithMeItem } from '@dataroom/shared';
import { EmptyState } from '@/components/common/empty-state';
import type { PreviewTarget } from '@/components/explorer/file-preview';
import { OwnerFilePreviewDialog } from '@/components/explorer/owner-file-preview-dialog';
import { NodeIcon } from '@/components/explorer/node-icon';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogRef } from '@/hooks/use-dialog';
import { useSharedWithMe } from '@/hooks/use-shares';
import { formatRelativeTime } from '@/lib/format';

export function SharedView() {
  const { data: items, isPending } = useSharedWithMe();
  const previewRef = useDialogRef<PreviewTarget>();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Shared with me</h1>
        <p className="text-sm text-muted-foreground">
          Read-only items other people gave you access to.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-xl border">
          {items.map((item) => (
            <SharedRow
              key={item.shareId}
              item={item}
              onOpenFile={(nodeId) => previewRef.current?.open({ id: nodeId, name: item.name })}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Inbox}
          title="Nothing shared with you yet"
          description="When someone shares a data room, folder or file with your email, it shows up here."
        />
      )}

      <OwnerFilePreviewDialog ref={previewRef} />
    </section>
  );
}

interface SharedRowProps {
  item: SharedWithMeItem;
  onOpenFile: (nodeId: string) => void;
}

function SharedRow({ item, onOpenFile }: SharedRowProps) {
  const isFile = item.type === 'FILE';
  const href =
    item.type === 'DATA_ROOM'
      ? `/rooms/${item.dataRoomId}`
      : `/rooms/${item.dataRoomId}/f/${item.nodeId}`;

  const body = (
    <>
      <NodeIcon type={isFile ? NodeType.FILE : NodeType.FOLDER} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          Shared by {item.ownerName} · {formatRelativeTime(item.sharedAt)}
        </p>
      </div>
      <Badge variant="secondary">Viewer</Badge>
    </>
  );

  return (
    <li>
      {isFile ? (
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
          onClick={() => (item.nodeId ? onOpenFile(item.nodeId) : undefined)}
        >
          {body}
        </button>
      ) : (
        <Link
          href={href}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
        >
          {body}
        </Link>
      )}
    </li>
  );
}
