import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { RequestWithContext } from './request-context';
import { StructuredLogger } from './structured-logger';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly logger: StructuredLogger) {}

  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const candidate = request.header('x-request-id');
    const requestId =
      candidate && /^[a-zA-Z0-9._:-]{1,100}$/.test(candidate) ? candidate : randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    const startedAt = performance.now();
    response.on('finish', () => {
      this.logger.log(
        {
          requestId,
          route: request.route?.path ?? request.path,
          method: request.method,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        },
        'http',
      );
    });
    next();
  }
}
