import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { dateRange } from '../common/date-range.js';
import { type Paginated, paginated } from '../common/pagination.js';
import { Prisma, RequestStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AssignRequestDto,
  CreateRequestDto,
  QueryRequestsDto,
  UpdateRequestDto,
} from './dto/requests.dto.js';
import {
  checkTransition,
  nextStatuses,
} from './request-status.machine.js';
import {
  type RequestDetail,
  requestDetailSelect,
  type RequestListItem,
  requestListSelect,
  requestReference,
  toRequestDetail,
  toRequestListItem,
} from './request.select.js';

// Named sets of statuses, so a list can ask for "everything still open" in one query.
const STATUS_GROUPS = {
  open: [RequestStatus.PENDING, RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS],
  closed: [RequestStatus.COMPLETED, RequestStatus.REJECTED, RequestStatus.CANCELLED],
} as const;

interface TransitionInput {
  requestId: string;
  from: RequestStatus;
  to: RequestStatus;
  note?: string;
  actor: AuthUser;
  ip?: string;
  auditAction: string;
  auditMetadata?: Prisma.InputJsonObject;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────────────────── Who can see what ─────────────────────────

  // The single definition of visibility. A role check on a route says "officers may
  // call this"; it does not say "this is THEIR request". Every query that reads or
  // changes a request adds this filter, so a request outside it simply does not
  // exist for the caller.
  private scope(actor: AuthUser): Prisma.ServiceRequestWhereInput {
    switch (actor.role) {
      case 'ADMIN':
        return {};
      case 'OFFICER':
        return { assignments: { some: { officerId: actor.id, isActive: true } } };
      default:
        return { requesterId: actor.id };
    }
  }

  // Loads the few fields needed to make decisions, or answers 404. Using 404 rather
  // than 403 for "not yours" means ids cannot be probed to learn which requests exist.
  async findScopedOrThrow(id: string, actor: AuthUser) {
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id, ...this.scope(actor) },
      select: { id: true, number: true, status: true, requesterId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  // ───────────────────────── Reading ─────────────────────────

  async list(
    query: QueryRequestsDto,
    actor: AuthUser,
  ): Promise<Paginated<RequestListItem>> {
    // AND-ing keeps the visibility scope separate from the user's filters, so no
    // filter can ever widen what the caller is allowed to see.
    const where = this.buildWhere(query, actor);

    const orderBy: Prisma.ServiceRequestOrderByWithRelationInput[] =
      query.sort === 'oldest'
        ? [{ createdAt: 'asc' }]
        : query.sort === 'priority'
          ? // Postgres orders an enum by its declaration order: LOW < MEDIUM < HIGH < URGENT.
            [{ priority: 'desc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.serviceRequest.findMany({
        where,
        select: requestListSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return paginated(rows.map(toRequestListItem), total, query);
  }

  // Visibility scope AND the caller's filters. Shared with the CSV export so the
  // file always contains exactly what the filtered table shows.
  buildWhere(
    query: QueryRequestsDto,
    actor: AuthUser,
  ): Prisma.ServiceRequestWhereInput {
    return { AND: [this.scope(actor), this.filters(query)] };
  }

  private filters(query: QueryRequestsDto): Prisma.ServiceRequestWhereInput {
    const where: Prisma.ServiceRequestWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.group && { status: { in: [...STATUS_GROUPS[query.group]] } }),
      ...(query.priority && { priority: query.priority }),
      ...(query.categoryId && { categoryId: query.categoryId }),
    };

    const createdAt = dateRange(query.from, query.to);
    if (createdAt) where.createdAt = createdAt;

    if (query.q) {
      const text: Prisma.ServiceRequestWhereInput[] = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
      ];
      // Also accept a reference: "NA-000042", "na-42" or just "42".
      const reference = /^(?:NA-?)?0*(\d{1,9})$/i.exec(query.q);
      if (reference) text.push({ number: Number(reference[1]) });
      where.OR = text;
    }
    return where;
  }

  async findOne(id: string, actor: AuthUser): Promise<RequestDetail> {
    const row = await this.prisma.serviceRequest.findFirst({
      where: { id, ...this.scope(actor) },
      select: requestDetailSelect,
    });
    if (!row) throw new NotFoundException('Request not found');
    return toRequestDetail(row);
  }

  // ───────────────────────── Creating and editing ─────────────────────────

  async create(
    dto: CreateRequestDto,
    actor: AuthUser,
    ip?: string,
  ): Promise<RequestDetail> {
    await this.assertCategoryUsable(dto.categoryId);

    const id = await this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: { ...this.editableFields(dto), requesterId: actor.id },
        select: { id: true, number: true },
      });
      // The first timeline entry: there is no "from" status yet.
      await tx.statusLog.create({
        data: {
          requestId: request.id,
          fromStatus: null,
          toStatus: RequestStatus.PENDING,
          note: 'Request submitted',
          changedById: actor.id,
        },
      });
      await this.audit.log(
        {
          action: 'request.created',
          entity: 'ServiceRequest',
          entityId: request.id,
          actorId: actor.id,
          metadata: { reference: requestReference(request.number) },
          ip,
        },
        tx,
      );
      return request.id;
    });
    return this.findOne(id, actor);
  }

  async update(
    id: string,
    dto: UpdateRequestDto,
    actor: AuthUser,
    ip?: string,
  ): Promise<RequestDetail> {
    const request = await this.findScopedOrThrow(id, actor);
    // Once someone has been assigned, changing what the request says would pull the
    // rug from under them. The requester can still cancel and submit a new one.
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        'A request can only be edited while it is pending',
      );
    }
    if (dto.categoryId !== undefined) {
      await this.assertCategoryUsable(dto.categoryId);
    }

    await this.prisma.$transaction(async (tx) => {
      // The status condition is repeated in the query: if an admin assigned the request
      // a moment ago, this matches nothing instead of silently overwriting.
      const { count } = await tx.serviceRequest.updateMany({
        where: { id, status: RequestStatus.PENDING },
        data: this.editableFields(dto),
      });
      if (count !== 1) throw this.staleConflict();
      await this.audit.log(
        {
          action: 'request.updated',
          entity: 'ServiceRequest',
          entityId: id,
          actorId: actor.id,
          metadata: { changedFields: Object.keys(dto) },
          ip,
        },
        tx,
      );
    });
    return this.findOne(id, actor);
  }

  // ───────────────────────── Status changes ─────────────────────────

  async changeStatus(
    id: string,
    to: RequestStatus,
    note: string | undefined,
    actor: AuthUser,
    ip?: string,
  ): Promise<RequestDetail> {
    // Being in scope already proves the caller is the right person: a requester only
    // finds their own requests, an officer only those actively assigned to them.
    const request = await this.findScopedOrThrow(id, actor);

    if (to === RequestStatus.ASSIGNED) {
      throw new BadRequestException(
        'To assign a request, use POST /requests/:id/assign and name the officer',
      );
    }
    this.assertTransition(request.status, to, actor, note);

    await this.prisma.$transaction((tx) =>
      this.applyTransition(tx, {
        requestId: id,
        from: request.status,
        to,
        note,
        actor,
        ip,
        auditAction: `request.${to.toLowerCase()}`,
      }),
    );
    return this.findOne(id, actor);
  }

  async assign(
    id: string,
    dto: AssignRequestDto,
    actor: AuthUser,
    ip?: string,
  ): Promise<RequestDetail> {
    const request = await this.findScopedOrThrow(id, actor);
    this.assertTransition(request.status, RequestStatus.ASSIGNED, actor);

    const officer = await this.prisma.user.findFirst({
      where: { id: dto.officerId, isActive: true, role: { name: 'OFFICER' } },
      select: { id: true, fullName: true },
    });
    if (!officer) {
      throw new BadRequestException(
        'officerId must be an active maintenance officer',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.assignment.findFirst({
        where: { requestId: id, isActive: true },
        select: { id: true, officerId: true },
      });
      if (current?.officerId === officer.id) {
        throw new BadRequestException(
          `${officer.fullName} is already assigned to this request`,
        );
      }

      // Reassignment never overwrites: the old row is closed and a new one is added,
      // so the history shows everyone who has held the request.
      if (current) {
        await tx.assignment.update({
          where: { id: current.id },
          data: { isActive: false, unassignedAt: new Date() },
        });
      }
      await tx.assignment.create({
        data: {
          requestId: id,
          officerId: officer.id,
          assignedById: actor.id,
          note: dto.note,
        },
      });

      await this.applyTransition(tx, {
        requestId: id,
        from: request.status,
        to: RequestStatus.ASSIGNED,
        note:
          dto.note ??
          `${current ? 'Reassigned' : 'Assigned'} to ${officer.fullName}`,
        actor,
        ip,
        auditAction: current ? 'request.reassigned' : 'request.assigned',
        auditMetadata: {
          officerId: officer.id,
          previousOfficerId: current?.officerId ?? null,
        },
      });
    });
    return this.findOne(id, actor);
  }

  // Turns the state machine's answer into the right HTTP error.
  private assertTransition(
    from: RequestStatus,
    to: RequestStatus,
    actor: AuthUser,
    note?: string,
  ) {
    const check = checkTransition(from, to, actor.role);
    if (!check.allowed) {
      if (check.reason === 'WRONG_ROLE') {
        throw new ForbiddenException(
          `Your role cannot move a request from ${from} to ${to}`,
        );
      }
      const next = nextStatuses(from);
      throw new BadRequestException(
        `A request that is ${from} cannot become ${to}. ` +
          (next.length > 0
            ? `Allowed next: ${next.join(', ')}.`
            : 'It is final.'),
      );
    }
    if (check.noteRequired && !note) {
      throw new BadRequestException(
        `A note explaining why is required to move a request to ${to}`,
      );
    }
  }

  // The ONLY place a request's status is written. Status, timeline entry and audit
  // entry are saved in one transaction: all three, or none.
  private async applyTransition(
    tx: Prisma.TransactionClient,
    input: TransitionInput,
  ) {
    // "Change it only if it is still in the status I checked." If two people act at
    // the same moment, the second finds nothing to update and gets a clear error,
    // instead of both changes being applied on top of each other.
    const { count } = await tx.serviceRequest.updateMany({
      where: { id: input.requestId, status: input.from },
      data: {
        status: input.to,
        completedAt: input.to === RequestStatus.COMPLETED ? new Date() : null,
      },
    });
    if (count !== 1) throw this.staleConflict();

    await tx.statusLog.create({
      data: {
        requestId: input.requestId,
        fromStatus: input.from,
        toStatus: input.to,
        note: input.note || null,
        changedById: input.actor.id,
      },
    });
    await this.audit.log(
      {
        action: input.auditAction,
        entity: 'ServiceRequest',
        entityId: input.requestId,
        actorId: input.actor.id,
        metadata: { from: input.from, to: input.to, ...input.auditMetadata },
        ip: input.ip,
      },
      tx,
    );
  }

  // ───────────────────────── Helpers ─────────────────────────

  private staleConflict() {
    return new ConflictException(
      'This request was just changed by someone else. Reload and try again.',
    );
  }

  private async assertCategoryUsable(categoryId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('categoryId must be an active category');
    }
  }

  // Copies only the fields a requester may set. Listing them explicitly means a new
  // column added later is never writable by accident.
  private editableFields<T extends UpdateRequestDto>(dto: T) {
    return {
      title: dto.title,
      description: dto.description,
      location: dto.location,
      categoryId: dto.categoryId,
      priority: dto.priority,
    } as Pick<T, 'title' | 'description' | 'location' | 'categoryId' | 'priority'>;
  }
}
