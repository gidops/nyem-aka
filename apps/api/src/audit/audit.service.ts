import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
}
