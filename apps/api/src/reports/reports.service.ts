import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { dateRange } from '../common/date-range.js';
import {
  Priority,
  type Prisma,
  RequestStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { QueryRequestsDto } from '../requests/dto/requests.dto.js';
import { requestReference } from '../requests/request.select.js';
import { RequestsService } from '../requests/requests.service.js';
import { type CsvValue, toCsv } from './csv.js';
import type { ReportRangeDto } from './reports.dto.js';

// A ceiling on one export, so a single click cannot load the whole table into memory.
export const MAX_EXPORT_ROWS = 10_000;

const HOUR_MS = 60 * 60 * 1000;

const OPEN_STATUSES: RequestStatus[] = ['PENDING', 'ASSIGNED', 'IN_PROGRESS'];

// Starts every key at 0, so the dashboard gets a value even for an empty status.
function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly audit: AuditService,
  ) {}

  async summary(range: ReportRangeDto) {
    const createdAt = dateRange(range.from, range.to);
    const where: Prisma.ServiceRequestWhereInput = createdAt ? { createdAt } : {};

    // The database does the counting (GROUP BY) and returns a handful of rows,
    // instead of sending every request to the API to be counted in JavaScript.
    const [byStatusRows, byPriorityRows, byCategoryRows, categories, completed] =
      await Promise.all([
        this.prisma.serviceRequest.groupBy({ by: ['status'], where, _count: { _all: true } }),
        this.prisma.serviceRequest.groupBy({ by: ['priority'], where, _count: { _all: true } }),
        this.prisma.serviceRequest.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
        this.prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        this.prisma.serviceRequest.findMany({
          where: { ...where, status: 'COMPLETED', completedAt: { not: null } },
          select: { createdAt: true, completedAt: true },
          take: MAX_EXPORT_ROWS,
        }),
      ]);

    const byStatus = zeroCounts(Object.values(RequestStatus));
    for (const row of byStatusRows) byStatus[row.status] = row._count._all;

    const byPriority = zeroCounts(Object.values(Priority));
    for (const row of byPriorityRows) byPriority[row.priority] = row._count._all;

    const categoryCounts = new Map(
      byCategoryRows.map((row) => [row.categoryId, row._count._all]),
    );
    const byCategory = categories
      .map((category) => ({ ...category, count: categoryCounts.get(category.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);

    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const totalHours = completed.reduce(
      (sum, row) => sum + (row.completedAt!.getTime() - row.createdAt.getTime()) / HOUR_MS,
      0,
    );

    return {
      total,
      open: OPEN_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
      byStatus,
      byPriority,
      byCategory,
      // null (not 0) when nothing has been completed: "no data" is not "instant".
      averageCompletionHours:
        completed.length > 0
          ? Math.round((totalHours / completed.length) * 10) / 10
          : null,
    };
  }

  async requestsCsv(query: QueryRequestsDto, actor: AuthUser, ip?: string) {
    const rows = await this.prisma.serviceRequest.findMany({
      // The same filter as the requests table, so the file matches what is on screen.
      where: this.requests.buildWhere(query, actor),
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      select: {
        number: true,
        title: true,
        location: true,
        priority: true,
        status: true,
        createdAt: true,
        completedAt: true,
        category: { select: { name: true } },
        requester: { select: { fullName: true, email: true } },
        assignments: {
          where: { isActive: true },
          take: 1,
          select: { officer: { select: { fullName: true } } },
        },
      },
    });

    const csv = toCsv(
      [
        'Reference',
        'Title',
        'Category',
        'Priority',
        'Status',
        'Location',
        'Requester',
        'Requester email',
        'Assigned officer',
        'Created',
        'Completed',
        'Hours to complete',
      ],
      rows.map((row): CsvValue[] => [
        requestReference(row.number),
        row.title,
        row.category.name,
        row.priority,
        row.status,
        row.location,
        row.requester.fullName,
        row.requester.email,
        row.assignments[0]?.officer.fullName,
        row.createdAt,
        row.completedAt,
        row.completedAt
          ? Math.round(((row.completedAt.getTime() - row.createdAt.getTime()) / HOUR_MS) * 10) / 10
          : null,
      ]),
    );

    // An export takes data out of the system, so it belongs in the audit trail.
    await this.audit.log({
      action: 'report.exported',
      entity: 'ServiceRequest',
      actorId: actor.id,
      metadata: {
        rows: rows.length,
        filters: {
          q: query.q ?? null,
          status: query.status ?? null,
          group: query.group ?? null,
          priority: query.priority ?? null,
          categoryId: query.categoryId ?? null,
          from: query.from ?? null,
          to: query.to ?? null,
        },
      },
      ip,
    });
    return csv;
  }
}
