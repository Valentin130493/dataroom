'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AddRecipientsInput, CreateShareInput } from '@dataroom/shared';
import { sharesApi } from '@/lib/api/endpoints';
import { messageOf } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useShares(dataRoomId: string, nodeId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.shares(dataRoomId, nodeId),
    queryFn: () => sharesApi.list(dataRoomId, nodeId),
    enabled,
  });
}

export function useSharedWithMe() {
  return useQuery({ queryKey: queryKeys.sharedWithMe, queryFn: sharesApi.sharedWithMe });
}

function useShareMutation<TVariables, TResult>(
  dataRoomId: string,
  nodeId: string | null,
  mutationFn: (variables: TVariables) => Promise<TResult>,
  successMessage: string,
  errorMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shares(dataRoomId, nodeId) });
      toast.success(successMessage);
    },
    onError: (error) => toast.error(messageOf(error, errorMessage)),
  });
}

export function useCreateShare(dataRoomId: string, nodeId: string | null) {
  return useShareMutation<CreateShareInput, unknown>(
    dataRoomId,
    nodeId,
    (input) => sharesApi.create(input),
    'Access granted',
    'Could not create the share',
  );
}

export function useRevokeShare(dataRoomId: string, nodeId: string | null) {
  return useShareMutation<string, void>(
    dataRoomId,
    nodeId,
    (id) => sharesApi.revoke(id),
    'Access revoked',
    'Could not revoke access',
  );
}

export function useAddRecipients(dataRoomId: string, nodeId: string | null) {
  return useShareMutation<{ shareId: string; input: AddRecipientsInput }, unknown>(
    dataRoomId,
    nodeId,
    ({ shareId, input }) => sharesApi.addRecipients(shareId, input),
    'People invited',
    'Could not invite these people',
  );
}

export function useRemoveRecipient(dataRoomId: string, nodeId: string | null) {
  return useShareMutation<{ shareId: string; recipientId: string }, unknown>(
    dataRoomId,
    nodeId,
    ({ shareId, recipientId }) => sharesApi.removeRecipient(shareId, recipientId),
    'Access removed',
    'Could not remove access',
  );
}
