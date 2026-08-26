import { HttpStatus } from '@nestjs/common';
import { ErrorCode, Page } from '@dataroom/shared';
import { DomainException } from '../errors/domain.exception';

export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) {
    return undefined;
  }

  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');

  if (!/^[0-9a-f-]{36}$/i.test(decoded)) {
    throw new DomainException(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      'Malformed pagination cursor',
    );
  }

  return decoded;
}

export function toPage<T extends { id: string }, R>(
  rows: T[],
  limit: number,
  map: (row: T) => R,
): Page<R> {
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;
  const last = visible.at(-1);

  return {
    items: visible.map(map),
    nextCursor: hasMore && last ? encodeCursor(last.id) : null,
  };
}
