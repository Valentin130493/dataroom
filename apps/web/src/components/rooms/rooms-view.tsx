'use client';

import { useState } from 'react';
import { FolderPlus, Plus } from 'lucide-react';
import type { DataRoomSummary } from '@dataroom/shared';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { NameDialog } from '@/components/common/name-dialog';
import { ShareDialog, type ShareTarget } from '@/components/share/share-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogRef } from '@/hooks/use-dialog';
import {
  useCreateDataRoom,
  useDataRooms,
  useDeleteDataRoom,
  useRenameDataRoom,
} from '@/hooks/use-data-rooms';
import { pluralize } from '@/lib/format';
import { RoomCard } from './room-card';
import { StorageMeter } from './storage-meter';

export function RoomsView() {
  const [isCreating, setIsCreating] = useState(false);
  const [renaming, setRenaming] = useState<DataRoomSummary | null>(null);
  const [deleting, setDeleting] = useState<DataRoomSummary | null>(null);
  const shareRef = useDialogRef<ShareTarget>();

  const { data: rooms, isPending } = useDataRooms();
  const createRoom = useCreateDataRoom();
  const deleteRoom = useDeleteDataRoom();
  const renameRoom = useRenameDataRoom(renaming?.id ?? '');

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My data rooms</h1>
          <p className="text-sm text-muted-foreground">
            {isPending ? 'Loading…' : pluralize(rooms?.length ?? 0, 'data room')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StorageMeter />
          <Button onClick={() => setIsCreating(true)}>
            <Plus />
            New data room
          </Button>
        </div>
      </header>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : rooms && rooms.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onRename={setRenaming}
              onShare={(target) =>
                shareRef.current?.open({
                  dataRoomId: target.id,
                  nodeId: null,
                  name: target.name,
                })
              }
              onDelete={setDeleting}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderPlus}
          title="No data rooms yet"
          description="Create a data room to collect the documents for a deal and share them with the other side."
          action={
            <Button onClick={() => setIsCreating(true)}>
              <Plus />
              New data room
            </Button>
          }
        />
      )}

      <NameDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        title="New data room"
        description="Give it the name of the deal or the counterparty."
        label="Name"
        submitLabel="Create"
        isPending={createRoom.isPending}
        onSubmit={(name) => createRoom.mutate({ name }, { onSuccess: () => setIsCreating(false) })}
      />

      <NameDialog
        open={renaming !== null}
        onOpenChange={(open) => (open ? undefined : setRenaming(null))}
        title="Rename data room"
        label="Name"
        initialValue={renaming?.name ?? ''}
        submitLabel="Save"
        isPending={renameRoom.isPending}
        onSubmit={(name) => renameRoom.mutate({ name }, { onSuccess: () => setRenaming(null) })}
      />

      <ShareDialog ref={shareRef} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? undefined : setDeleting(null))}
        title="Delete this data room?"
        description={
          deleting ? (
            <>
              <p>
                <strong className="text-foreground">{deleting.name}</strong> and all{' '}
                {pluralize(deleting.fileCount, 'file')} inside it will be removed.
              </p>
              <p>Everyone it was shared with loses access immediately.</p>
            </>
          ) : null
        }
        confirmLabel="Delete data room"
        isPending={deleteRoom.isPending}
        onConfirm={() =>
          deleting ? deleteRoom.mutate(deleting.id, { onSuccess: () => setDeleting(null) }) : undefined
        }
      />
    </section>
  );
}
