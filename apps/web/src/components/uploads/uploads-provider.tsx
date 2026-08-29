'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConflictStrategy, UPLOAD_CONCURRENCY, type NodeSummary } from '@dataroom/shared';
import { ApiError } from '@/lib/api/http';
import { uploadsApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { runWithConcurrency, uploadWithProgress } from '@/lib/upload/xhr-upload';

export type UploadStatus = 'queued' | 'uploading' | 'finalizing' | 'done' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  resultName?: string;
}

interface EnqueueParams {
  dataRoomId: string;
  parentId: string | null;
  files: File[];
  onConflict: ConflictStrategy;
}

interface UploadsContextValue {
  items: UploadItem[];
  isActive: boolean;
  enqueue: (params: EnqueueParams) => Promise<void>;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
}

const UploadsContext = createContext<UploadsContextValue | null>(null);

export function UploadsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const abortHandlers = useRef(new Map<string, () => void>());

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }, []);

  const enqueue = useCallback(
    async ({ dataRoomId, parentId, files, onConflict }: EnqueueParams) => {
      if (files.length === 0) {
        return;
      }

      let tickets;

      try {
        tickets = await uploadsApi.init(dataRoomId, {
          parentId,
          files: files.map((file) => ({
            name: file.name,
            size: file.size,
            mimeType: 'application/pdf',
          })),
        });
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Could not start the upload';

        setItems((current) => [
          ...current,
          ...files.map((file) => ({
            id: `${file.name}-${file.lastModified}-${file.size}`,
            name: file.name,
            size: file.size,
            status: 'error' as const,
            progress: 0,
            error: message,
          })),
        ]);

        return;
      }

      const jobs = tickets.map((ticket, index) => ({ ticket, file: files[index] as File }));

      setItems((current) => [
        ...current,
        ...jobs.map(({ ticket, file }) => ({
          id: ticket.uploadId,
          name: file.name,
          size: file.size,
          status: 'queued' as const,
          progress: 0,
        })),
      ]);

      await runWithConcurrency(jobs, UPLOAD_CONCURRENCY, async ({ ticket, file }) => {
        patch(ticket.uploadId, { status: 'uploading' });

        try {
          await uploadWithProgress({
            url: ticket.uploadUrl,
            method: ticket.method,
            headers: ticket.headers,
            file,
            onProgress: (fraction) => patch(ticket.uploadId, { progress: fraction }),
            registerAbort: (abort) => abortHandlers.current.set(ticket.uploadId, abort),
          });

          patch(ticket.uploadId, { status: 'finalizing', progress: 1 });

          const node: NodeSummary = await uploadsApi.confirm({
            uploadId: ticket.uploadId,
            onConflict,
          });

          patch(ticket.uploadId, { status: 'done', resultName: node.name });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            patch(ticket.uploadId, { status: 'canceled' });
            void uploadsApi.abort(ticket.uploadId).catch(() => undefined);
            return;
          }

          patch(ticket.uploadId, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          });
        } finally {
          abortHandlers.current.delete(ticket.uploadId);
        }
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.nodeChildren(dataRoomId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
      await queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage });

      if (parentId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.node(parentId) });
      }
    },
    [patch, queryClient],
  );

  const cancel = useCallback((id: string) => {
    abortHandlers.current.get(id)?.();
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => item.status !== 'done'));
  }, []);

  const value = useMemo<UploadsContextValue>(
    () => ({
      items,
      isActive: items.some(
        (item) => item.status === 'queued' || item.status === 'uploading' || item.status === 'finalizing',
      ),
      enqueue,
      cancel,
      dismiss,
      clearFinished,
    }),
    [items, enqueue, cancel, dismiss, clearFinished],
  );

  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads(): UploadsContextValue {
  const context = useContext(UploadsContext);

  if (!context) {
    throw new Error('useUploads must be used inside UploadsProvider');
  }

  return context;
}
