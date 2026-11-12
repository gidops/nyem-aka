import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { RoleName } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type PublicUser,
  publicUserSelect,
  toPublicUser,
} from '../users/user.select.js';
import type { JwtPayload, TokenPair } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

export interface Session {
  user: PublicUser;
  tokens: TokenPair;
}

// Refresh tokens are long random-looking strings, so a fast hash is enough to store
// them safely. (Passwords are short and guessable, which is why they need argon2.)
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, ip?: string): Promise<Session> {
    const requesterRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: RoleName.REQUESTER },
    });
    const passwordHash = await argon2.hash(dto.password);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            department: dto.department,
            roleId: requesterRole.id,
          },
          select: publicUserSelect,
        });
        await this.audit.log(
          {
            action: 'auth.register',
            entity: 'User',
            entityId: created.id,
            actorId: created.id,
            ip,
          },
          tx,
        );
        return created;
      });
      return this.startSession(toPublicUser(row));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, ip?: string): Promise<Session> {
    const row = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...publicUserSelect, passwordHash: true },
    });
    const passwordOk = row
      ? await argon2.verify(row.passwordHash, dto.password)
      : false;

    if (!row || !passwordOk) {
      await this.audit.log({
        action: 'auth.login_failed',
        entity: 'User',
        entityId: row?.id,
        metadata: { email: dto.email },
        ip,
      });
      // One message for both cases, so an attacker cannot learn which emails exist.
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!row.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }

    const { passwordHash: _passwordHash, ...publicRow } = row;
    const session = await this.startSession(toPublicUser(publicRow));
    await this.audit.log({
      action: 'auth.login',
      entity: 'User',
      entityId: row.id,
      actorId: row.id,
      ip,
    });
    return session;
  }

  // Exchanges a valid refresh token for a new pair. The old refresh token stops
  // working immediately ("rotation"), so a stolen one is useful at most once.
  async refresh(refreshToken: string | undefined): Promise<Session> {
    const userId = await this.verifyRefreshToken(refreshToken);
    const row = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { ...publicUserSelect, refreshTokenHash: true },
        })
      : null;

    if (!refreshToken || !row || !row.isActive || !row.refreshTokenHash) {
      throw new UnauthorizedException('Session expired');
    }
    if (!sameHash(row.refreshTokenHash, hashToken(refreshToken))) {
      // A correctly signed token that is not the current one has already been used.
      // That suggests it was copied, so end the session and force a fresh login.
      await this.prisma.user.update({
        where: { id: row.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Session expired');
    }

    const { refreshTokenHash: _refreshTokenHash, ...publicRow } = row;
    return this.startSession(toPublicUser(publicRow));
  }

  // Never throws: logging out must always succeed from the user's point of view,
  // even if their tokens have already expired.
  async logout(refreshToken: string | undefined, ip?: string): Promise<void> {
    const userId = await this.verifyRefreshToken(refreshToken);
    if (!userId) return;

    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, refreshTokenHash: { not: null } },
      data: { refreshTokenHash: null },
    });
    if (count > 0) {
      await this.audit.log({
        action: 'auth.logout',
        entity: 'User',
        entityId: userId,
        actorId: userId,
        ip,
      });
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!row || !row.isActive) {
      throw new UnauthorizedException('Session expired');
    }
    return toPublicUser(row);
  }

  private async startSession(user: PublicUser): Promise<Session> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Number(this.config.getOrThrow('JWT_ACCESS_TTL_SECONDS')),
      }),
      // `jti` (a random id) makes every refresh token unique, even two issued
      // in the same second for the same user.
      this.jwt.signAsync(
        { sub: user.id, jti: randomUUID() },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: Number(this.config.getOrThrow('JWT_REFRESH_TTL_SECONDS')),
        },
      ),
    ]);

    // Store only the hash: someone who reads the database cannot use it to sign in.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });
    return { user, tokens: { accessToken, refreshToken } };
  }

  private async verifyRefreshToken(
    token: string | undefined,
  ): Promise<string | null> {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      return payload.sub;
    } catch {
      return null;
    }
  }
}
