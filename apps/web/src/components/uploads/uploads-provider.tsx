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
import { toast } from 'sonner';
import {
  ConflictStrategy,
  UPLOAD_CONCURRENCY,
  type AllowedMimeType,
  type NodeSummary,
} from '@dataroom/shared';
import { ApiError } from '@/lib/api/http';
import { uploadsApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { runWithConcurrency, uploadWithProgress } from '@/lib/upload/xhr-upload';

export type UploadStatus = 'queued' | 'uploading' | 'finalizing' | 'done' | 'error' | 'canceled';

export interface UploadRequest {
  dataRoomId: string;
  parentId: string | null;
  onConflict: ConflictStrategy;
}

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  resultName?: string;
  file: File;
  request: UploadRequest;
}

interface EnqueueParams extends UploadRequest {
  files: File[];
}

interface UploadsContextValue {
  items: UploadItem[];
  isActive: boolean;
  isPanelOpen: boolean;
  failedCount: number;
  setPanelOpen: (open: boolean) => void;
  enqueue: (params: EnqueueParams) => Promise<void>;
  cancel: (id: string) => void;
  cancelAll: () => void;
  retryFailed: () => void;
  clear: () => void;
}

const UploadsContext = createContext<UploadsContextValue | null>(null);

let localId = 0;

function nextLocalId(): string {
  localId += 1;

  return `local-${localId}`;
}

export function UploadsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const abortHandlers = useRef(new Map<string, () => void>());

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const enqueue = useCallback(
    async ({ files, ...request }: EnqueueParams) => {
      if (files.length === 0) {
        return;
      }

      setPanelOpen(true);

      const placeholders = files.map((file) => ({
        id: nextLocalId(),
        name: file.name,
        size: file.size,
        status: 'queued' as const,
        progress: 0,
        file,
        request,
      }));

      setItems((current) => [...current, ...placeholders]);

      let tickets;

      try {
        tickets = await uploadsApi.init(request.dataRoomId, {
          parentId: request.parentId,
          files: files.map((file) => ({
            name: file.name,
            size: file.size,
            mimeType: file.type as AllowedMimeType,
          })),
        });
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Could not start the upload';

        toast.error(message);
        placeholders.forEach((item) => patch(item.id, { status: 'error', error: message }));

        return;
      }

      const jobs = tickets.map((ticket, index) => ({
        ticket,
        placeholder: placeholders[index] as UploadItem,
      }));

      await runWithConcurrency(jobs, UPLOAD_CONCURRENCY, async ({ ticket, placeholder }) => {
        patch(placeholder.id, { status: 'uploading' });

        try {
          await uploadWithProgress({
            url: ticket.uploadUrl,
            method: ticket.method,
            headers: ticket.headers,
            file: placeholder.file,
            onProgress: (fraction) => patch(placeholder.id, { progress: fraction }),
            registerAbort: (abort) => abortHandlers.current.set(placeholder.id, abort),
          });

          patch(placeholder.id, { status: 'finalizing', progress: 1 });

          const node: NodeSummary = await uploadsApi.confirm({
            uploadId: ticket.uploadId,
            onConflict: request.onConflict,
          });

          patch(placeholder.id, { status: 'done', resultName: node.name });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            patch(placeholder.id, { status: 'canceled' });
            void uploadsApi.abort(ticket.uploadId).catch(() => undefined);

            return;
          }

          patch(placeholder.id, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed',
          });
        } finally {
          abortHandlers.current.delete(placeholder.id);
        }
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.nodeChildren(request.dataRoomId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms });
      await queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage });

      if (request.parentId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.node(request.parentId) });
      }
    },
    [patch, queryClient],
  );

  const cancel = useCallback((id: string) => {
    abortHandlers.current.get(id)?.();
  }, []);

  const cancelAll = useCallback(() => {
    abortHandlers.current.forEach((abort) => abort());
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const retryFailed = useCallback(() => {
    const failed = items.filter((item) => item.status === 'error');

    if (failed.length === 0) {
      return;
    }

    setItems((current) => current.filter((item) => item.status !== 'error'));

    const byRequest = new Map<string, { request: UploadRequest; files: File[] }>();

    failed.forEach((item) => {
      const key = `${item.request.dataRoomId}:${item.request.parentId}:${item.request.onConflict}`;
      const bucket = byRequest.get(key) ?? { request: item.request, files: [] };

      bucket.files.push(item.file);
      byRequest.set(key, bucket);
    });

    byRequest.forEach(({ request, files }) => {
      void enqueue({ ...request, files });
    });
  }, [enqueue, items]);

  const value = useMemo<UploadsContextValue>(() => {
    const isActive = items.some(
      (item) =>
        item.status === 'queued' || item.status === 'uploading' || item.status === 'finalizing',
    );

    return {
      items,
      isActive,
      isPanelOpen,
      failedCount: items.filter((item) => item.status === 'error').length,
      setPanelOpen,
      enqueue,
      cancel,
      cancelAll,
      retryFailed,
      clear,
    };
  }, [items, isPanelOpen, enqueue, cancel, cancelAll, retryFailed, clear]);

  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads(): UploadsContextValue {
  const context = useContext(UploadsContext);

  if (!context) {
    throw new Error('useUploads must be used inside UploadsProvider');
  }

  return context;
}
