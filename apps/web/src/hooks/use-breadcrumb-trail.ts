'use client';

import { useEffect, useMemo } from 'react';
import type { BreadcrumbItem, NodeDetails } from '@dataroom/shared';
import { removeStorage } from '@/lib/storage/local-storage';
import { useLocalStorage } from './use-local-storage';

interface CachedTrail {
  trail: BreadcrumbItem[];
  name: string;
  touchedAt: number;
}

type TrailCache = Record<string, CachedTrail>;

const EMPTY_CACHE: TrailCache = {};
const MAX_ENTRIES = 100;

function pruned(cache: TrailCache): TrailCache {
  const entries = Object.entries(cache);

  if (entries.length <= MAX_ENTRIES) {
    return cache;
  }

  return Object.fromEntries(
    entries.sort(([, a], [, b]) => b.touchedAt - a.touchedAt).slice(0, MAX_ENTRIES),
  );
}

export function useBreadcrumbTrail(
  dataRoomId: string,
  folderId: string | null,
  details: NodeDetails | undefined,
) {
  const [cache, setCache] = useLocalStorage<TrailCache>(`breadcrumbs:${dataRoomId}`, EMPTY_CACHE);

  useEffect(() => {
    if (!folderId || !details) {
      return;
    }

    setCache((current) =>
      pruned({
        ...current,
        [folderId]: { trail: details.breadcrumbs, name: details.name, touchedAt: Date.now() },
      }),
    );
  }, [folderId, details, setCache]);

  return useMemo(() => {
    if (!folderId) {
      return { trail: [] as BreadcrumbItem[], currentName: null, isStale: false };
    }

    if (details) {
      return { trail: details.breadcrumbs, currentName: details.name, isStale: false };
    }

    const cached = cache[folderId];

    return {
      trail: cached?.trail ?? [],
      currentName: cached?.name ?? null,
      isStale: Boolean(cached),
    };
  }, [folderId, details, cache]);
}

export function forgetBreadcrumbs(dataRoomId: string): void {
  removeStorage(`breadcrumbs:${dataRoomId}`);
}
