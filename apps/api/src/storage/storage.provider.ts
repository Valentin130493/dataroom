export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface SignedUpload {
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface SignedDownload {
  url: string;
  expiresAt: Date;
}

export interface StorageUsageReport {
  usedBytes: number;
  objectCount: number;
}

export interface StorageProvider {
  buildKey(dataRoomId: string, fileName: string): string;
  usage(): Promise<StorageUsageReport>;
  createSignedUpload(key: string, mimeType: string): Promise<SignedUpload>;
  createSignedDownload(key: string, downloadName?: string): Promise<SignedDownload>;
  copy(sourceKey: string, targetKey: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
}
