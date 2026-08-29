import { z } from 'zod';
import {
  FORBIDDEN_NAME_CHARS,
  MAX_NAME_LENGTH,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  RESERVED_NAMES,
} from '../constants';
import { SortDirection, SortField } from '../enums';

export const idSchema = z.string().uuid();

export function optionalText<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );
}

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`)
  .refine((value) => !FORBIDDEN_NAME_CHARS.test(value), {
    message: 'Name cannot contain / \\ : * ? " < > |',
  })
  .refine((value) => !RESERVED_NAMES.includes(value as (typeof RESERVED_NAMES)[number]), {
    message: 'Name is reserved',
  });

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});
export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export const sortSchema = z.object({
  sortBy: z.nativeEnum(SortField).default(SortField.NAME),
  sortDir: z.nativeEnum(SortDirection).default(SortDirection.ASC),
});

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
