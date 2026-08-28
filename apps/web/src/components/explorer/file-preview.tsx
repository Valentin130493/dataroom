'use client';

import { Download, ExternalLink, Loader2 } from 'lucide-react';
import type { FileVersionSummary } from '@dataroom/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes, formatDateTime } from '@/lib/format';

export interface PreviewTarget {
  id: string;
  name: string;
  size?: number;
  updatedAt?: string;
  version?: number;
}

export interface PreviewSource {
  url: string | undefined;
  isLoading: boolean;
  isUnavailable: boolean;
  versions?: FileVersionSummary[];
}

interface FilePreviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  target: PreviewTarget;
  source: PreviewSource;
}

export function FilePreview({ isOpen, onOpenChange, target, source }: FilePreviewProps) {
  const subtitle =
    [
      target.size === undefined ? null : formatBytes(target.size),
      target.updatedAt ? `updated ${formatDateTime(target.updatedAt)}` : null,
      target.version && target.version > 1 ? `version ${target.version}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Document';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-w-none flex-col gap-0 rounded-none p-0 sm:h-[85vh] sm:max-w-5xl sm:rounded-xl">
        <DialogHeader className="flex-row items-center gap-3 border-b px-4 py-3 pr-12">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base">{target.name}</DialogTitle>
            <DialogDescription className="text-xs">{subtitle}</DialogDescription>
          </div>

          {source.url ? (
            <div className="hidden items-center gap-1 sm:flex">
              <Button variant="outline" size="sm" asChild>
                <a href={source.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={source.url} download={target.name}>
                  <Download />
                  Download
                </a>
              </Button>
            </div>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-muted/40">
          {source.isUnavailable ? (
            <PreviewMessage
              title="This file is no longer available"
              detail="It was deleted or your access was revoked."
            />
          ) : source.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : source.url ? (
            <iframe src={source.url} title={target.name} className="size-full border-0" />
          ) : (
            <PreviewMessage
              title="Preview unavailable"
              detail="The document could not be loaded right now."
            />
          )}
        </div>

        {source.url ? (
          <div className="flex items-center gap-2 border-t px-4 py-2 sm:hidden">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={source.url} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={source.url} download={target.name}>
                <Download />
                Download
              </a>
            </Button>
          </div>
        ) : null}

        {source.versions && source.versions.length > 1 ? (
          <div className="scrollbar-thin max-h-32 overflow-y-auto border-t px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Version history</p>
            <ul className="space-y-1.5">
              {source.versions.map((version) => (
                <li key={version.id} className="flex items-center gap-2 text-sm">
                  <Badge variant={version.isCurrent ? 'default' : 'secondary'}>
                    v{version.version}
                  </Badge>
                  <span className="text-muted-foreground">{formatBytes(version.size)}</span>
                  <span className="truncate text-muted-foreground">
                    {version.createdByName} · {formatDateTime(version.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
