import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  SIGNED_DOWNLOAD_TTL_SECONDS,
  SIGNED_UPLOAD_TTL_SECONDS,
} from '@dataroom/shared';
import { Env } from '../config/env';
import { SignedDownload, SignedUpload, StorageProvider } from './storage.provider';

@Injectable()
export class SupabaseStorageService implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.client = createClient(
      config.get('SUPABASE_URL', { infer: true }),
      config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
      { auth: { persistSession: false } },
    );
    this.bucket = config.get('SUPABASE_STORAGE_BUCKET', { infer: true });
  }

  async onModuleInit(): Promise<void> {
    const options = {
      public: false,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES],
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
    };

    const { data } = await this.client.storage.getBucket(this.bucket);

    const { error } = data
      ? await this.client.storage.updateBucket(this.bucket, options)
      : await this.client.storage.createBucket(this.bucket, options);

    if (error) {
      this.logger.error(`Could not configure bucket "${this.bucket}": ${error.message}`);
      return;
    }

    this.logger.log(
      `Storage bucket "${this.bucket}" is private, PDF-only, capped at ${MAX_FILE_SIZE_BYTES} bytes`,
    );
  }

  buildKey(dataRoomId: string, fileName: string): string {
    const extension = extname(fileName).toLowerCase().slice(0, 16);
    return `${dataRoomId}/${randomUUID()}${extension}`;
  }

  async createSignedUpload(key: string, mimeType: string): Promise<SignedUpload> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUploadUrl(key);

    if (error || !data) {
      this.logger.error(`Failed to sign upload for ${key}`, error?.message);
      throw new InternalServerErrorException('Could not prepare the upload');
    }

    return {
      uploadUrl: data.signedUrl,
      method: 'PUT',
      headers: { 'content-type': mimeType },
      expiresAt: new Date(Date.now() + SIGNED_UPLOAD_TTL_SECONDS * 1000),
    };
  }

  async createSignedDownload(key: string, downloadName?: string): Promise<SignedDownload> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, SIGNED_DOWNLOAD_TTL_SECONDS, {
        download: downloadName,
      });

    if (error || !data) {
      this.logger.error(`Failed to sign download for ${key}`, error?.message);
      throw new InternalServerErrorException('Could not prepare the download');
    }

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + SIGNED_DOWNLOAD_TTL_SECONDS * 1000),
    };
  }

  async copy(sourceKey: string, targetKey: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).copy(sourceKey, targetKey);

    if (error) {
      this.logger.error(`Failed to copy ${sourceKey} to ${targetKey}`, error.message);
      throw new InternalServerErrorException('Could not copy the file');
    }
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const { error } = await this.client.storage.from(this.bucket).remove(keys);

    if (error) {
      this.logger.warn(`Failed to remove ${keys.length} object(s): ${error.message}`);
    }
  }
}
