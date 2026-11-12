import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCategoryDto, UpdateCategoryDto } from './categories.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Admins see every category (to manage them); everyone else sees only the ones
  // they can pick when submitting a request.
  list(actor: AuthUser) {
    return this.prisma.category.findMany({
      where: actor.role === 'ADMIN' ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateCategoryDto, actor: AuthUser, ip?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.create({ data: dto });
        await this.audit.log(
          {
            action: 'category.created',
            entity: 'Category',
            entityId: String(category.id),
            actorId: actor.id,
            metadata: { name: category.name },
            ip,
          },
          tx,
        );
        return category;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A category with this name already exists');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateCategoryDto, actor: AuthUser, ip?: string) {
    await this.findOrThrow(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.update({ where: { id }, data: dto });
        await this.audit.log(
          {
            action: 'category.updated',
            entity: 'Category',
            entityId: String(id),
            actorId: actor.id,
            metadata: { changedFields: Object.keys(dto) },
            ip,
          },
          tx,
        );
        return category;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A category with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: number, actor: AuthUser, ip?: string) {
    const category = await this.findOrThrow(id);
    // Deleting a category that requests point at would orphan them (and the database
    // would refuse anyway). Deactivating keeps history intact.
    const inUse = await this.prisma.serviceRequest.count({
      where: { categoryId: id },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `This category is used by ${inUse} request(s). Deactivate it instead of deleting it.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await this.audit.log(
        {
          action: 'category.deleted',
          entity: 'Category',
          entityId: String(id),
          actorId: actor.id,
          metadata: { name: category.name },
          ip,
        },
        tx,
      );
    });
    return { success: true };
  }

  private async findOrThrow(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
