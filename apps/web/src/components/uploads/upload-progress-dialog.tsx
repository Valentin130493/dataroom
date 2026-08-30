'use client';

import { CheckCircle2, Loader2, RotateCcw, X, XCircle } from 'lucide-react';
import { ResponsiveDialog } from '@/components/common/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatBytes, pluralize } from '@/lib/format';
import { useUploads, type UploadItem } from './uploads-provider';

export function UploadProgressDialog() {
  const { items, isActive, isPanelOpen, failedCount, setPanelOpen, cancel, cancelAll, retryFailed, clear } =
    useUploads();

  if (items.length === 0) {
    return null;
  }

  const done = items.filter((item) => item.status === 'done').length;

  return (
    <ResponsiveDialog
      open={isPanelOpen}
      onOpenChange={setPanelOpen}
      title={title(isActive, failedCount, done, items.length)}
      description={
        isActive
          ? 'You can close this window — the transfer keeps going.'
          : failedCount > 0
            ? 'Nothing was left half-written: a failed upload adds no document.'
            : undefined
      }
      className="sm:max-w-lg"
      footer={
        isActive ? (
          <Button variant="outline" onClick={cancelAll}>
            Cancel all
          </Button>
        ) : (
          <>
            {failedCount > 0 ? (
              <Button variant="outline" onClick={retryFailed}>
                <RotateCcw />
                Retry {pluralize(failedCount, 'file')}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setPanelOpen(false);
                clear();
              }}
            >
              Done
            </Button>
          </>
        )
      }
    >
      <ul className="scrollbar-thin max-h-80 divide-y overflow-y-auto rounded-lg border">
        {items.map((item) => (
          <UploadRow key={item.id} item={item} onCancel={cancel} />
        ))}
      </ul>
    </ResponsiveDialog>
  );
}

function title(isActive: boolean, failed: number, done: number, total: number): string {
  if (isActive) {
    return `Uploading ${done} of ${total}`;
  }

  if (failed > 0) {
    return `${pluralize(failed, 'upload')} failed`;
  }

  return `${pluralize(done, 'file')} uploaded`;
}

function UploadRow({ item, onCancel }: { item: UploadItem; onCancel: (id: string) => void }) {
  const isRunning =
    item.status === 'queued' || item.status === 'uploading' || item.status === 'finalizing';
  const wasRenamed = item.resultName && item.resultName !== item.name;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <StatusIcon status={item.status} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.name}</p>

        {item.status === 'error' ? (
          <p className="truncate text-xs text-destructive">{item.error}</p>
        ) : item.status === 'canceled' ? (
          <p className="text-xs text-muted-foreground">Canceled</p>
        ) : item.status === 'done' ? (
          <p className="truncate text-xs text-muted-foreground">
            {wasRenamed ? `Saved as ${item.resultName}` : formatBytes(item.size)}
          </p>
        ) : item.status === 'finalizing' ? (
          <p className="text-xs text-muted-foreground">Finishing…</p>
        ) : (
          <Progress value={Math.round(item.progress * 100)} className="mt-1.5 h-1" />
        )}
      </div>

      {isRunning ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Cancel upload of ${item.name}`}
          onClick={() => onCancel(item.id)}
        >
          <X />
        </Button>
      ) : null}
    </li>
  );
}

function StatusIcon({ status }: { status: UploadItem['status'] }) {
  if (status === 'done') {
    return <CheckCircle2 className="size-4 shrink-0 text-[color:var(--success)]" />;
  }

  if (status === 'error') {
    return <XCircle className="size-4 shrink-0 text-destructive" />;
  }

  if (status === 'canceled') {
    return <X className="size-4 shrink-0 text-muted-foreground" />;
  }

  return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
}
