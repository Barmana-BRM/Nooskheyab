import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/auth.decorators';
import type { RequestWithContext } from '../common/request-context';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.user || !required.includes(request.user.role)) throw new ForbiddenException('دسترسی لازم برای این عملیات را ندارید.');
    return true;
  }
}
