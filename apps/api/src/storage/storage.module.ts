import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.provider';
import { SupabaseStorageService } from './supabase-storage.service';

@Global()
@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: SupabaseStorageService }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
