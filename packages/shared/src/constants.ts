export const ALLOWED_MIME_TYPES = ['application/pdf'] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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
