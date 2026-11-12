import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RoleName } from '../../generated/prisma/client.js';
import type { AuthUser } from '../auth.types.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

// Answers "is this caller allowed here?". Runs after JwtAuthGuard.
// 401 means "we do not know who you are"; 403 means "we know, and the answer is no".
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // No @Roles() on the route: any signed-in user may call it.
    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
