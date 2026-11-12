import type { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './auth.constants.js';
import type { TokenPair } from './auth.types.js';

function baseOptions(config: ConfigService): CookieOptions {
  return {
    // JavaScript in the page cannot read the cookie, so an XSS bug cannot steal the token.
    httpOnly: true,
    // Only sent over HTTPS in production. Off locally because localhost is plain HTTP.
    secure: config.get<string>('NODE_ENV') === 'production',
    // Not sent on cross-site POSTs, which blocks the classic CSRF attack.
    sameSite: 'lax',
    // '/' because the browser sees the API under /api/* (via the Next.js proxy)
    // while the API itself sees /auth/*; a narrower path would not match both.
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: TokenPair,
  config: ConfigService,
) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(config),
    maxAge: Number(config.getOrThrow('JWT_ACCESS_TTL_SECONDS')) * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(config),
    maxAge: Number(config.getOrThrow('JWT_REFRESH_TTL_SECONDS')) * 1000,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService) {
  // A cookie is only removed if the options match the ones it was set with.
  res.clearCookie(ACCESS_COOKIE, baseOptions(config));
  res.clearCookie(REFRESH_COOKIE, baseOptions(config));
}
