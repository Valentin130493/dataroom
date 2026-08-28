'use client';

import type { Ref } from 'react';
import { ResponsiveDialog } from '@/components/common/responsive-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDialog, type DialogHandle } from '@/hooks/use-dialog';
import { useShares } from '@/hooks/use-shares';
import { ShareLinkTab } from './share-link-tab';
import { SharePeopleTab } from './share-people-tab';

export interface ShareTarget {
  dataRoomId: string;
  nodeId: string | null;
  name: string;
}

export function ShareDialog({ ref }: { ref: Ref<DialogHandle<ShareTarget>> }) {
  const { isOpen, payload: target, setOpen } = useDialog<ShareTarget>(ref);
  const { data: shares, isPending } = useShares(
    target?.dataRoomId ?? '',
    target?.nodeId ?? null,
    isOpen && Boolean(target),
  );

  if (!target) {
    return null;
  }

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={setOpen}
      title={`Share “${target.name}”`}
      description="Recipients get read-only access to this item and everything nested inside it."
      className="sm:max-w-lg"
    >
      <div>
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="people">
            <TabsList className="w-full">
              <TabsTrigger value="people" className="flex-1">
                Invite people
              </TabsTrigger>
              <TabsTrigger value="link" className="flex-1">
                Public link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="people" className="pt-4">
              <SharePeopleTab
                dataRoomId={target.dataRoomId}
                nodeId={target.nodeId}
                shares={shares ?? []}
              />
            </TabsContent>

            <TabsContent value="link" className="pt-4">
              <ShareLinkTab
                dataRoomId={target.dataRoomId}
                nodeId={target.nodeId}
                shares={shares ?? []}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ResponsiveDialog>
  );
}
