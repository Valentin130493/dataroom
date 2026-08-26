'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  readStorage,
  removeStorage,
  subscribeToStorage,
  writeStorage,
} from '@/lib/storage/local-storage';

export function useLocalStorage<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribeToStorage,
    () => readStorage(key, fallback),
    () => fallback,
  );

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved =
        typeof next === 'function' ? (next as (current: T) => T)(readStorage(key, fallback)) : next;

      writeStorage(key, resolved);
    },
    [key, fallback],
  );

  const remove = useCallback(() => removeStorage(key), [key]);

  return [value, set, remove] as const;
}
