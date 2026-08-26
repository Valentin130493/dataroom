'use client';

import { useState } from 'react';
import { ChevronRight, CornerLeftUp, Folder, Loader2 } from 'lucide-react';
import { NodeType, type NodeSummary } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import { DEFAULT_SORT, useNodeList } from '@/hooks/use-nodes';
import { cn } from '@/lib/utils';

interface FolderPickerProps {
  dataRoomId: string;
  rootLabel: string;
  disabledIds: string[];
  value: string | null;
  onChange: (folderId: string | null) => void;
}

interface Level {
  id: string | null;
  name: string;
}

export function FolderPicker({
  dataRoomId,
  rootLabel,
  disabledIds,
  value,
  onChange,
}: FolderPickerProps) {
  const [stack, setStack] = useState<Level[]>([{ id: null, name: rootLabel }]);
  const current = stack.at(-1) as Level;

  const { data, isPending } = useNodeList(dataRoomId, current.id, DEFAULT_SORT);

  const folders = (data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((node) => node.type === NodeType.FOLDER);

  const open = (folder: NodeSummary) => {
    setStack((levels) => [...levels, { id: folder.id, name: folder.name }]);
    onChange(folder.id);
  };

  const goUp = () => {
    setStack((levels) => {
      const next = levels.slice(0, -1);
      onChange(next.at(-1)?.id ?? null);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Go up one folder"
          disabled={stack.length === 1}
          onClick={goUp}
        >
          <CornerLeftUp />
        </Button>
        <span className="truncate font-medium text-foreground">{current.name}</span>
      </div>

      <div className="scrollbar-thin h-56 overflow-y-auto rounded-lg border">
        {isPending ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : folders.length === 0 ? (
          <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            No sub-folders here. Move it into “{current.name}”.
          </p>
        ) : (
          <ul className="divide-y">
            {folders.map((folder) => {
              const isDisabled = disabledIds.includes(folder.id);

              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => open(folder)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isDisabled
                        ? 'cursor-not-allowed text-muted-foreground/50'
                        : 'hover:bg-muted',
                      value === folder.id && 'bg-muted',
                    )}
                  >
                    <Folder className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{folder.name}</span>
                    {!isDisabled ? (
                      <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
