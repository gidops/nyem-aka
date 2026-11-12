import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE } from '../auth.constants.js';
import type { AuthUser, JwtPayload } from '../auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

// Answers "who is calling?". Registered globally, so every route requires a valid
// access token unless it is marked @Public(). Forgetting a decorator therefore
// fails closed (401) instead of leaving a route open.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token: unknown = request.cookies?.[ACCESS_COOKIE];
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Not signed in');
    }

    try {
      // Verifying checks the signature (the token was issued by us and not altered)
      // and the expiry. No database call is needed.
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Session expired');
    }
  }
}
