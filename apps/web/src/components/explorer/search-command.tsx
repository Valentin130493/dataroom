'use client';

import { useEffect, useState, type Ref } from 'react';
import { NodeType, SEARCH_MIN_QUERY_LENGTH, type NodeSummary } from '@dataroom/shared';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { useNodeSearch } from '@/hooks/use-nodes';
import { formatBytes } from '@/lib/format';
import { NodeIcon } from './node-icon';

interface SearchCommandProps {
  ref: Ref<DialogHandle<void>>;
  dataRoomId: string;
  onSelect: (node: NodeSummary) => void;
}

export function SearchCommand({ ref, dataRoomId, onSelect }: SearchCommandProps) {
  const { isOpen, setOpen, close } = useDialog<void>(ref);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 200);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebounced('');
    }
  }, [isOpen]);

  const isSearchable = debounced.length >= SEARCH_MIN_QUERY_LENGTH;
  const { data, isFetching } = useNodeSearch(dataRoomId, debounced, isOpen && isSearchable);

  const results = data?.items ?? [];

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search files and folders in this data room…"
        />
        <CommandList>
          {!isSearchable ? (
            <CommandEmpty>Type at least {SEARCH_MIN_QUERY_LENGTH} characters.</CommandEmpty>
          ) : isFetching && results.length === 0 ? (
            <CommandEmpty>Searching…</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>Nothing matches “{debounced}”.</CommandEmpty>
          ) : (
            <CommandGroup heading="Results">
              {results.map((node) => (
                <CommandItem
                  key={node.id}
                  value={node.id}
                  onSelect={() => {
                    close();
                    onSelect(node);
                  }}
                >
                  <NodeIcon type={node.type} className="size-6" />
                  <span className="truncate">{node.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {node.type === NodeType.FOLDER ? 'Folder' : formatBytes(node.size)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
