'use client';

import { Download, FolderInput, MoreHorizontal, PencilLine, Share2, Trash2 } from 'lucide-react';
import { NodeType, type NodeSummary } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatBytes, formatRelativeTime } from '@/lib/format';
import { hasAnyAction, type NodeActions } from './node-actions';
import { NodeIcon } from './node-icon';

interface NodeRowProps {
  node: NodeSummary;
  actions: NodeActions;
  onOpen: (node: NodeSummary) => void;
}

export function NodeRow({ node, actions, onOpen }: NodeRowProps) {
  const isFolder = node.type === NodeType.FOLDER;

  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(node)}>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <NodeIcon type={node.type} mimeType={node.mimeType} />
          <button
            type="button"
            className="truncate rounded font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(node);
            }}
          >
            {node.name}
          </button>
          {!isFolder && node.version > 1 ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              v{node.version}
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
        {formatBytes(node.size)}
      </TableCell>

      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
        {formatRelativeTime(node.updatedAt)}
      </TableCell>

      <TableCell className="w-10">
        {hasAnyAction(actions) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Actions for ${node.name}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-44"
              onClick={(event) => event.stopPropagation()}
            >
              {actions.onDownload && !isFolder ? (
                <DropdownMenuItem onSelect={() => actions.onDownload?.(node)}>
                  <Download />
                  Download
                </DropdownMenuItem>
              ) : null}
              {actions.onRename ? (
                <DropdownMenuItem onSelect={() => actions.onRename?.(node)}>
                  <PencilLine />
                  Rename
                </DropdownMenuItem>
              ) : null}
              {actions.onMove ? (
                <DropdownMenuItem onSelect={() => actions.onMove?.(node)}>
                  <FolderInput />
                  Move to…
                </DropdownMenuItem>
              ) : null}
              {actions.onShare ? (
                <DropdownMenuItem onSelect={() => actions.onShare?.(node)}>
                  <Share2 />
                  Share
                </DropdownMenuItem>
              ) : null}
              {actions.onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete?.(node)}>
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
