import { Injectable } from '@nestjs/common';
import { paginated } from '../common/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { QueryAuditLogsDto } from './audit.dto.js';

export interface AuditEntry {
  action: string; // "<area>.<what happened>", e.g. "auth.login", "user.role_changed"
  entity: string; // the kind of record affected, e.g. "User"
  entityId?: string;
  actorId?: string | null; // null when nobody is signed in (a failed login)
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Pass `tx` when the audited change runs inside a transaction: the audit row is then
  // saved or rolled back together with the change, so the trail can never claim
  // something happened that did not (or miss something that did).
  async log(entry: AuditEntry, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        actorId: entry.actorId ?? null,
        metadata: entry.metadata,
        ip: entry.ip,
      },
    });
  }

  async list(query: QueryAuditLogsDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity && { entity: query.entity }),
      ...(query.entityId && { entityId: query.entityId }),
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.action && { action: { startsWith: query.action } }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          metadata: true,
          ip: true,
          createdAt: true,
          actor: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(rows, total, query);
  }
}
