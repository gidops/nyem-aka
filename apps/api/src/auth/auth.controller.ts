import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE } from './auth.constants.js';
import { clearAuthCookies, setAuthCookies } from './auth.cookies.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

// Tighter rate limit for the endpoints an attacker would hammer to guess passwords.
const STRICT_LIMIT = { default: { limit: 5, ttl: 60_000 } };

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // `passthrough: true` lets us set cookies on the response while Nest still
  // serialises the return value as JSON. The tokens go in cookies only, never the body.

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('register')
  @ApiOperation({ summary: 'Create a requester account and sign in' })
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.register(dto, ip);
    setAuthCookies(res, tokens, this.config);
    return { user };
  }

  @Public()
  @Throttle(STRICT_LIMIT)
  @Post('login')
  @HttpCode(200) // POST defaults to 201 Created; a login creates nothing
  @ApiOperation({ summary: 'Sign in; sets httpOnly cookies' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto, ip);
    setAuthCookies(res, tokens, this.config);
    return { user };
  }

  // Public because it is called exactly when the access token has expired.
  // The refresh cookie is the credential here.
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new token pair' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { user, tokens } = await this.auth.refresh(readRefreshCookie(req));
      setAuthCookies(res, tokens, this.config);
      return { user };
    } catch (error) {
      clearAuthCookies(res, this.config);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'End the session and clear the cookies' })
  async logout(
    @Req() req: Request,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(readRefreshCookie(req), ip);
    clearAuthCookies(res, this.config);
    return { success: true };
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'The signed-in user' })
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.auth.me(user.id) };
  }
}
