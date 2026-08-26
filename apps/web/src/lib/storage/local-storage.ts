const PREFIX = 'dataroom:v1';

interface StorageEntry<T> {
  value: T;
  savedAt: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
const parsed = new Map<string, { raw: string; value: unknown }>();

function fullKey(key: string): string {
  return `${PREFIX}:${key}`;
}

function withStorage<T>(action: (storage: Storage) => T): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return action(window.localStorage);
  } catch {
    return null;
  }
}

export function readStorage<T>(key: string, fallback: T): T {
  const raw = withStorage((storage) => storage.getItem(fullKey(key)));

  if (!raw) {
    return fallback;
  }

  const memo = parsed.get(key);

  if (memo && memo.raw === raw) {
    return memo.value as T;
  }

  try {
    const value = (JSON.parse(raw) as StorageEntry<T>).value ?? fallback;

    parsed.set(key, { raw, value });

    return value;
  } catch {
    removeStorage(key);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  const entry: StorageEntry<T> = { value, savedAt: Date.now() };
  const raw = JSON.stringify(entry);

  withStorage((storage) => storage.setItem(fullKey(key), raw));
  parsed.set(key, { raw, value });
  emit();
}

export function removeStorage(key: string): void {
  withStorage((storage) => storage.removeItem(fullKey(key)));
  parsed.delete(key);
  emit();
}

export function subscribeToStorage(listener: Listener): () => void {
  listeners.add(listener);

  const onCrossTabChange = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(PREFIX)) {
      parsed.clear();
      listener();
    }
  };

  window.addEventListener('storage', onCrossTabChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onCrossTabChange);
  };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}
