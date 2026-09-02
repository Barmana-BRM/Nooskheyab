import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(code: string, message: string, status: HttpStatus, fields?: Record<string, string>) {
    super({ code, message, fields }, status);
    this.code = code;
    this.fields = fields;
  }
}

export const publicNotFound = (): AppError =>
  new AppError(
    'PRESCRIPTION_NOT_FOUND',
    'درخواست پیدا نشد یا کد دسترسی معتبر نیست.',
    HttpStatus.NOT_FOUND,
  );

export const conflict = (code: string, message: string): AppError =>
  new AppError(code, message, HttpStatus.CONFLICT);
