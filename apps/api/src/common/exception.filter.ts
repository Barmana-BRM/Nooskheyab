import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { unlink } from 'node:fs/promises';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { RequestWithContext } from './request-context';
import { AppError } from './errors';
import { StructuredLogger } from './structured-logger';

interface ErrorBody {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<Response>();
    const requestId = request.requestId ?? 'unknown';
    const uploadedPath = (request as RequestWithContext & { file?: { path?: string } }).file?.path;
    if (uploadedPath) void unlink(uploadedPath).catch(() => undefined);
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = { code: 'INTERNAL_ERROR', message: 'خطای داخلی سامانه رخ داد.' };

    if (exception instanceof AppError) {
      status = exception.getStatus();
      body = { code: exception.code, message: exception.message };
      if (exception.fields) body.fields = exception.fields;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        const messages = Array.isArray(record.message) ? record.message : undefined;
        body = {
          code: status === HttpStatus.UNPROCESSABLE_ENTITY ? 'VALIDATION_ERROR' : 'REQUEST_ERROR',
          message: messages
            ? 'اطلاعات واردشده معتبر نیست.'
            : typeof record.message === 'string'
              ? record.message
              : 'درخواست معتبر نیست.',
        };
        if (messages) body.fields = { form: messages.join('، ') };
      }
    } else if (exception instanceof PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      body = { code: 'DUPLICATE_RESOURCE', message: 'رکورد تکراری است.' };
    } else if (this.isMulterError(exception)) {
      const isTooLarge = (exception as { code?: unknown }).code === 'LIMIT_FILE_SIZE';
      status = isTooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.UNPROCESSABLE_ENTITY;
      body = isTooLarge
        ? { code: 'FILE_TOO_LARGE', message: 'حجم فایل بیش از حد مجاز است.' }
        : { code: 'INVALID_FILE', message: 'فایل ارسالی معتبر نیست.' };
    } else if (this.isBodyParserError(exception)) {
      const isTooLarge = this.bodyParserStatus(exception) === HttpStatus.PAYLOAD_TOO_LARGE;
      status = isTooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
      body = isTooLarge
        ? { code: 'REQUEST_TOO_LARGE', message: 'حجم درخواست بیش از حد مجاز است.' }
        : { code: 'INVALID_REQUEST', message: 'بدنه درخواست معتبر نیست.' };
    }

    const event = {
      requestId,
      route: request.route?.path ?? request.path,
      method: request.method,
      statusCode: status,
      errorCode: body.code ?? 'REQUEST_ERROR',
      errorName: exception instanceof Error ? exception.constructor.name : 'UnknownError',
    };
    if (status >= 500) this.logger.error(event, undefined, 'exception');
    else this.logger.warn(event, 'exception');

    response.status(status).json({ success: false, error: body, requestId });
  }

  private isMulterError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') return false;
    const candidate = exception as { name?: unknown; code?: unknown };
    return candidate.name === 'MulterError' && typeof candidate.code === 'string';
  }

  private isBodyParserError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') return false;
    const candidate = exception as { type?: unknown; status?: unknown; statusCode?: unknown };
    return (
      candidate.type === 'entity.too.large' ||
      candidate.type === 'entity.parse.failed' ||
      candidate.status === HttpStatus.PAYLOAD_TOO_LARGE ||
      candidate.statusCode === HttpStatus.PAYLOAD_TOO_LARGE
    );
  }

  private bodyParserStatus(exception: unknown): number {
    if (!exception || typeof exception !== 'object') return HttpStatus.BAD_REQUEST;
    const candidate = exception as { status?: unknown; statusCode?: unknown };
    const status = candidate.status ?? candidate.statusCode;
    return typeof status === 'number' ? status : HttpStatus.BAD_REQUEST;
  }
}
