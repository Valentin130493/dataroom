'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { SortDirection, SortField, type NodeSummary } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortState } from '@/hooks/use-nodes';
import type { NodeActions } from './node-actions';
import { NodeRow } from './node-row';

interface NodeTableProps {
  nodes: NodeSummary[];
  actions: NodeActions;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onOpen: (node: NodeSummary) => void;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

const COLUMNS: { field: SortField; label: string; className: string }[] = [
  { field: SortField.NAME, label: 'Name', className: '' },
  { field: SortField.SIZE, label: 'Size', className: 'hidden w-28 sm:table-cell' },
  { field: SortField.UPDATED_AT, label: 'Modified', className: 'hidden w-40 md:table-cell' },
];

export function NodeTable({
  nodes,
  actions,
  sort,
  onSortChange,
  onOpen,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: NodeTableProps) {
  const toggleSort = (field: SortField) => {
    onSortChange(
      sort.sortBy === field
        ? {
            sortBy: field,
            sortDir: sort.sortDir === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC,
          }
        : { sortBy: field, sortDir: SortDirection.ASC },
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.field} className={column.className}>
                <Button
                  variant="ghost"
                  size="xs"
                  className="-ml-2 font-medium text-muted-foreground"
                  onClick={() => toggleSort(column.field)}
                >
                  {column.label}
                  {sort.sortBy === column.field ? (
                    sort.sortDir === SortDirection.ASC ? (
                      <ArrowUp />
                    ) : (
                      <ArrowDown />
                    )
                  ) : null}
                </Button>
              </TableHead>
            ))}
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : nodes.map((node) => (
                <NodeRow key={node.id} node={node} actions={actions} onOpen={onOpen} />
              ))}
        </TableBody>
      </Table>

      {hasMore ? (
        <div className={cn('border-t p-2 text-center')}>
          <Button variant="ghost" size="sm" disabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
