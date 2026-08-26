'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateDataRoomInput, RenameDataRoomInput } from '@dataroom/shared';
import { dataRoomsApi } from '@/lib/api/endpoints';
import { messageOf } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export function useDataRooms() {
  return useQuery({ queryKey: queryKeys.dataRooms, queryFn: dataRoomsApi.list });
}

export function useDataRoom(id: string) {
  return useQuery({ queryKey: queryKeys.dataRoom(id), queryFn: () => dataRoomsApi.get(id) });
}

export function useCreateDataRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDataRoomInput) => dataRoomsApi.create(input),
    onSuccess: (room) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
      toast.success(`Created "${room.name}"`);
    },
    onError: (error) => toast.error(messageOf(error, 'Could not create the data room')),
  });
}

export function useRenameDataRoom(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RenameDataRoomInput) => dataRoomsApi.rename(id, input),
    onSuccess: (room) => {
      queryClient.setQueryData(queryKeys.dataRoom(id), room);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
      toast.success('Data room renamed');
    },
    onError: (error) => toast.error(messageOf(error, 'Could not rename the data room')),
  });
}

export function useDeleteDataRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataRoomsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
      toast.success('Data room deleted');
    },
    onError: (error) => toast.error(messageOf(error, 'Could not delete the data room')),
  });
}
