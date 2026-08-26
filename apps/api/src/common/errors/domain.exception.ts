import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@dataroom/shared';

export class DomainException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: unknown,
  ) {
    super({ statusCode: status, code, message, details }, status);
  }

  static notFound(message = 'Not found') {
    return new DomainException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }

  static forbidden(message = 'Forbidden') {
    return new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new DomainException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, message);
  }

  static gone(code: ErrorCode, message: string) {
    return new DomainException(code, HttpStatus.GONE, message);
  }

  static conflict(code: ErrorCode, message: string, details?: unknown) {
    return new DomainException(code, HttpStatus.CONFLICT, message, details);
  }

  static unprocessable(code: ErrorCode, message: string, details?: unknown) {
    return new DomainException(code, HttpStatus.UNPROCESSABLE_ENTITY, message, details);
  }

  static badRequest(code: ErrorCode, message: string, details?: unknown) {
    return new DomainException(code, HttpStatus.BAD_REQUEST, message, details);
  }

  static notConfigured(message: string) {
    return new DomainException(
      ErrorCode.PROVIDER_NOT_CONFIGURED,
      HttpStatus.NOT_IMPLEMENTED,
      message,
    );
  }
}
