import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { type Paginated, paginated } from '../common/pagination.js';
import { Prisma, type RoleName } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/users.dto.js';
import {
  type PublicUser,
  publicUserSelect,
  toPublicUser,
} from './user.select.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<Paginated<PublicUser>> {
    // Build the filter from whichever query parameters were supplied.
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: { name: query.role } }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.q && {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    // The page of rows and the total count must describe the same filter,
    // so both run in one transaction.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(toPublicUser), total, query);
  }

  async create(
    dto: CreateUserDto,
    actor: AuthUser,
    ip?: string,
  ): Promise<PublicUser> {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
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
            roleId: role.id,
          },
          select: publicUserSelect,
        });
        await this.audit.log(
          {
            action: 'user.created',
            entity: 'User',
            entityId: created.id,
            actorId: actor.id,
            metadata: { role: dto.role },
            ip,
          },
          tx,
        );
        return created;
      });
      return toPublicUser(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthUser,
    ip?: string,
  ): Promise<PublicUser> {
    await this.findOrThrow(id);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { fullName: dto.fullName, department: dto.department },
        select: publicUserSelect,
      });
      await this.audit.log(
        {
          action: 'user.updated',
          entity: 'User',
          entityId: id,
          actorId: actor.id,
          metadata: { changedFields: Object.keys(dto) },
          ip,
        },
        tx,
      );
      return updated;
    });
    return toPublicUser(row);
  }

  async changeRole(
    id: string,
    roleName: RoleName,
    actor: AuthUser,
    ip?: string,
  ): Promise<PublicUser> {
    // Guard against an admin locking themselves (and possibly everyone) out.
    if (id === actor.id) {
      throw new BadRequestException('You cannot change your own role');
    }
    const existing = await this.findOrThrow(id);
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        // Clearing the refresh hash ends the user's session, so their next token
        // is issued with the new role instead of the old one lingering.
        data: { roleId: role.id, refreshTokenHash: null },
        select: publicUserSelect,
      });
      await this.audit.log(
        {
          action: 'user.role_changed',
          entity: 'User',
          entityId: id,
          actorId: actor.id,
          metadata: { from: existing.role, to: roleName },
          ip,
        },
        tx,
      );
      return updated;
    });
    return toPublicUser(row);
  }

  async setStatus(
    id: string,
    isActive: boolean,
    actor: AuthUser,
    ip?: string,
  ): Promise<PublicUser> {
    if (id === actor.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    await this.findOrThrow(id);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          isActive,
          // A deactivated user must not be able to refresh their way back in.
          ...(!isActive && { refreshTokenHash: null }),
        },
        select: publicUserSelect,
      });
      await this.audit.log(
        {
          action: isActive ? 'user.activated' : 'user.deactivated',
          entity: 'User',
          entityId: id,
          actorId: actor.id,
          ip,
        },
        tx,
      );
      return updated;
    });
    return toPublicUser(row);
  }

  private async findOrThrow(id: string): Promise<PublicUser> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!row) throw new NotFoundException('User not found');
    return toPublicUser(row);
  }
}
