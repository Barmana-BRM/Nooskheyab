import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { RequestWithContext } from './request-context';
import { AppError } from './errors';

interface ErrorBody {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<Response>();
    const requestId = request.requestId ?? 'unknown';
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
    } else if (this.isMulterFileSizeError(exception)) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      body = { code: 'FILE_TOO_LARGE', message: 'حجم فایل بیش از حد مجاز است.' };
    }

    response.status(status).json({ success: false, error: body, requestId });
  }

  private isMulterFileSizeError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') return false;
    const candidate = exception as { name?: unknown; code?: unknown };
    return candidate.name === 'MulterError' && candidate.code === 'LIMIT_FILE_SIZE';
  }
}
