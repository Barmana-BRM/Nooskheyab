import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { RequestWithContext } from './request-context';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (request.path === '/health') return next.handle();
    return next
      .handle()
      .pipe(map((data: unknown) => ({ success: true, data, requestId: request.requestId })));
  }
}
