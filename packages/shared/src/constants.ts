export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
] as const;

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const OFFICE_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const ALLOWED_MIME_TYPES = [
  ...DOCUMENT_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  ...OFFICE_MIME_TYPES,
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_EXTENSIONS: Record<AllowedMimeType, string[]> = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

export function isImage(mimeType: string | null | undefined): boolean {
  return IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number]);
}

export function isInlineDocument(mimeType: string | null | undefined): boolean {
  return DOCUMENT_MIME_TYPES.includes(mimeType as (typeof DOCUMENT_MIME_TYPES)[number]);
}

export function canPreviewInline(mimeType: string | null | undefined): boolean {
  return isImage(mimeType) || isInlineDocument(mimeType);
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const STORAGE_QUOTA_BYTES = 50 * 1024 * 1024;

export const MAX_FOLDER_DEPTH = 32;

export const MAX_NAME_LENGTH = 255;

export const FORBIDDEN_NAME_CHARS = /[/\\:*?"<>|]/;

export const RESERVED_NAMES = ['.', '..'] as const;

export const PAGE_SIZE_DEFAULT = 50;
export const PAGE_SIZE_MAX = 200;

export const SIGNED_DOWNLOAD_TTL_SECONDS = 60 * 5;
export const SIGNED_UPLOAD_TTL_SECONDS = 60 * 15;

export const UPLOAD_CONCURRENCY = 3;
export const MAX_UPLOAD_BATCH = 50;

export const SEARCH_MIN_QUERY_LENGTH = 2;

export const ACCESS_COOKIE_NAME = 'dr_access';
export const REFRESH_COOKIE_NAME = 'dr_refresh';
