'use client';

import type { Ref } from 'react';
import { ConflictStrategy } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { pluralize } from '@/lib/format';

export interface UploadConflict {
  files: File[];
  conflicting: string[];
}

interface UploadConflictDialogProps {
  ref: Ref<DialogHandle<UploadConflict>>;
  onResolve: (files: File[], strategy: ConflictStrategy) => void;
}

export function UploadConflictDialog({ ref, onResolve }: UploadConflictDialogProps) {
  const { isOpen, payload, setOpen, close } = useDialog<UploadConflict>(ref);

  if (!payload) {
    return null;
  }

  const resolve = (strategy: ConflictStrategy) => {
    close();
    onResolve(payload.files, strategy);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pluralize(payload.conflicting.length, 'file')} already{' '}
            {payload.conflicting.length === 1 ? 'exists' : 'exist'} here
          </DialogTitle>
          <DialogDescription>Choose what to do with the matching names.</DialogDescription>
        </DialogHeader>

        <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto rounded-lg border p-3 text-sm">
          {payload.conflicting.map((name) => (
            <li key={name} className="truncate text-muted-foreground">
              {name}
            </li>
          ))}
        </ul>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => resolve(ConflictStrategy.KEEP_BOTH)}>
              Keep both
            </Button>
            <Button onClick={() => resolve(ConflictStrategy.REPLACE)}>Upload as new version</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
