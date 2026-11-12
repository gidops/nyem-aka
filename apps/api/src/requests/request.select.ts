import { Prisma } from '../generated/prisma/client.js';

// The shapes of a request as the API returns it: a light one for lists and a full
// one for the detail page. Defining them once keeps every endpoint consistent and
// makes sure no user field beyond a name (or email, on detail) is ever exposed.

const person = { id: true, fullName: true } satisfies Prisma.UserSelect;

export const requestListSelect = {
  id: true,
  number: true,
  title: true,
  location: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  category: { select: { id: true, name: true } },
  requester: { select: person },
  // Only the current assignment, to show who is working on it.
  assignments: {
    where: { isActive: true },
    take: 1,
    select: { officer: { select: person } },
  },
  _count: { select: { attachments: true } },
} satisfies Prisma.ServiceRequestSelect;

export const requestDetailSelect = {
  id: true,
  number: true,
  title: true,
  description: true,
  location: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  category: { select: { id: true, name: true } },
  requester: {
    select: { id: true, fullName: true, email: true, department: true },
  },
  // The full assignment history, newest first.
  assignments: {
    orderBy: { assignedAt: 'desc' },
    select: {
      id: true,
      note: true,
      isActive: true,
      assignedAt: true,
      unassignedAt: true,
      officer: { select: person },
      assignedBy: { select: person },
    },
  },
  // The timeline, oldest first.
  statusLogs: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      changedBy: {
        select: { id: true, fullName: true, role: { select: { name: true } } },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      url: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: person },
    },
  },
} satisfies Prisma.ServiceRequestSelect;

type ListRow = Prisma.ServiceRequestGetPayload<{ select: typeof requestListSelect }>;
type DetailRow = Prisma.ServiceRequestGetPayload<{ select: typeof requestDetailSelect }>;

// The friendly reference shown to users, derived from the database sequence.
export function requestReference(number: number): string {
  return `NA-${String(number).padStart(6, '0')}`;
}

export function toRequestListItem(row: ListRow) {
  const { assignments, _count, ...rest } = row;
  return {
    ...rest,
    reference: requestReference(row.number),
    assignedOfficer: assignments[0]?.officer ?? null,
    attachmentCount: _count.attachments,
  };
}

export function toRequestDetail(row: DetailRow) {
  const { statusLogs, ...rest } = row;
  return {
    ...rest,
    reference: requestReference(row.number),
    assignedOfficer:
      row.assignments.find((assignment) => assignment.isActive)?.officer ?? null,
    timeline: statusLogs.map(({ changedBy, ...log }) => ({
      ...log,
      changedBy: {
        id: changedBy.id,
        fullName: changedBy.fullName,
        role: changedBy.role.name,
      },
    })),
  };
}

export type RequestListItem = ReturnType<typeof toRequestListItem>;
export type RequestDetail = ReturnType<typeof toRequestDetail>;
