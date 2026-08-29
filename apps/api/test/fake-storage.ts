import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  SignedDownload,
  SignedUpload,
  StorageProvider,
  StorageUsageReport,
} from '../src/storage/storage.provider';

export class FakeStorage implements StorageProvider {
  readonly objects = new Set<string>();
  readonly removed: string[] = [];
  usedBytes = 0;

  usage(): Promise<StorageUsageReport> {
    return Promise.resolve({ usedBytes: this.usedBytes, objectCount: this.objects.size });
  }

  buildKey(dataRoomId: string, fileName: string): string {
    return `${dataRoomId}/${randomUUID()}${extname(fileName)}`;
  }

  createSignedUpload(key: string, mimeType: string): Promise<SignedUpload> {
    this.objects.add(key);

    return Promise.resolve({
      uploadUrl: `https://storage.test/upload/${key}`,
      method: 'PUT',
      headers: { 'content-type': mimeType },
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  createSignedDownload(key: string): Promise<SignedDownload> {
    return Promise.resolve({
      url: `https://storage.test/object/${key}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  copy(sourceKey: string, targetKey: string): Promise<void> {
    this.objects.add(targetKey);

    return Promise.resolve();
  }

  remove(keys: string[]): Promise<void> {
    keys.forEach((key) => {
      this.objects.delete(key);
      this.removed.push(key);
    });

    return Promise.resolve();
  }
}
