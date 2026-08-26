export interface XhrUploadParams {
  url: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  file: File;
  onProgress: (fraction: number) => void;
  registerAbort: (abort: () => void) => void;
}

export function uploadWithProgress(params: XhrUploadParams): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(params.method, params.url, true);

    Object.entries(params.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        params.onProgress(event.loaded / event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress(1);
        resolve();
        return;
      }

      reject(new Error(`Storage rejected the upload (${xhr.status})`));
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));

    params.registerAbort(() => xhr.abort());
    xhr.send(params.file);
  });
}

export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];

  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    let next = queue.shift();

    while (next !== undefined) {
      await worker(next);
      next = queue.shift();
    }
  });

  await Promise.all(runners);
}
