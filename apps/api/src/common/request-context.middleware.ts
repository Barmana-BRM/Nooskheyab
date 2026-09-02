import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { RequestWithContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const candidate = request.header('x-request-id');
    const requestId = candidate && /^[a-zA-Z0-9._:-]{1,100}$/.test(candidate) ? candidate : randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
