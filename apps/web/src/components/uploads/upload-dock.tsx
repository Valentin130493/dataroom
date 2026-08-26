'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUploads, type UploadItem } from './uploads-provider';

export function UploadDock() {
  const { items, isActive, cancel, dismiss, clearFinished } = useUploads();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const done = items.filter((item) => item.status === 'done').length;

  return (
    <aside
      aria-label="Uploads"
      className="fixed right-4 bottom-4 z-40 w-[22rem] overflow-hidden rounded-xl border bg-card shadow-lg"
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        {isActive ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-[color:var(--success)]" />
        )}

        <p className="text-sm font-medium">
          {isActive ? `Uploading ${done}/${items.length}` : `${items.length} upload(s) finished`}
        </p>

        <div className="ml-auto flex items-center gap-0.5">
          {!isActive && (
            <Button variant="ghost" size="xs" onClick={clearFinished}>
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={isCollapsed ? 'Expand uploads' : 'Collapse uploads'}
            onClick={() => setIsCollapsed((value) => !value)}
          >
            <ChevronDown className={cn('transition-transform', isCollapsed && 'rotate-180')} />
          </Button>
        </div>
      </header>

      {!isCollapsed && (
        <ul className="scrollbar-thin max-h-72 divide-y overflow-y-auto">
          {items.map((item) => (
            <UploadRow key={item.id} item={item} onCancel={cancel} onDismiss={dismiss} />
          ))}
        </ul>
      )}
    </aside>
  );
}

interface UploadRowProps {
  item: UploadItem;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}

function UploadRow({ item, onCancel, onDismiss }: UploadRowProps) {
  const isRunning = item.status === 'uploading' || item.status === 'queued';
  const wasRenamed = item.resultName && item.resultName !== item.name;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
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
        ) : (
          <Progress value={Math.round(item.progress * 100)} className="mt-1.5 h-1" />
        )}
      </div>

      {item.status === 'done' ? (
        <CheckCircle2 className="size-4 shrink-0 text-[color:var(--success)]" />
      ) : item.status === 'error' ? (
        <XCircle className="size-4 shrink-0 text-destructive" />
      ) : null}

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={isRunning ? `Cancel upload of ${item.name}` : `Dismiss ${item.name}`}
        onClick={() => (isRunning ? onCancel(item.id) : onDismiss(item.id))}
      >
        <X />
      </Button>
    </li>
  );
}
