'use client';

import { useRef } from 'react';
import { FolderPlus, Search, Share2, Upload } from 'lucide-react';
import { ALLOWED_MIME_TYPES } from '@dataroom/shared';
import { Button } from '@/components/ui/button';

interface ExplorerToolbarProps {
  onCreateFolder: () => void;
  onUpload: (files: File[]) => void;
  onShare: () => void;
  onSearch: () => void;
}

export function ExplorerToolbar({
  onCreateFolder,
  onUpload,
  onShare,
  onSearch,
}: ExplorerToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="justify-start gap-2 text-muted-foreground sm:w-64"
        onClick={onSearch}
      >
        <Search />
        Search files…
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" onClick={onShare}>
          <Share2 />
          Share
        </Button>

        <Button variant="outline" onClick={onCreateFolder}>
          <FolderPlus />
          New folder
        </Button>

        <Button onClick={() => inputRef.current?.click()}>
          <Upload />
          Upload
        </Button>

        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={(event) => {
            onUpload(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
