'use client';

import Link from 'next/link';
import { FolderLock, MoreHorizontal, PencilLine, Share2, Trash2 } from 'lucide-react';
import type { DataRoomSummary } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes, formatRelativeTime, pluralize } from '@/lib/format';

interface RoomCardProps {
  room: DataRoomSummary;
  onRename: (room: DataRoomSummary) => void;
  onShare: (room: DataRoomSummary) => void;
  onDelete: (room: DataRoomSummary) => void;
}

export function RoomCard({ room, onRename, onShare, onDelete }: RoomCardProps) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderLock className="size-4" />
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${room.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onRename(room)}>
              <PencilLine />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onShare(room)}>
              <Share2 />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(room)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <Link href={`/rooms/${room.id}`} className="after:absolute after:inset-0">
          <h3 className="truncate font-medium tracking-tight">{room.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground">
          {pluralize(room.fileCount, 'file')} · {formatBytes(room.totalSize)}
        </p>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        Updated {formatRelativeTime(room.updatedAt)}
      </p>
    </div>
  );
}
