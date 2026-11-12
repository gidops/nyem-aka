import { RequestStatus, RoleName } from '../generated/prisma/client.js';

// The rules of the request lifecycle, in one place.
//
//   PENDING ──assign──▶ ASSIGNED ──▶ IN_PROGRESS ──▶ COMPLETED
//      │                                  ▲               │
//      ├──▶ REJECTED (admin)              └──── reopen ───┘ (admin)
//      └──▶ CANCELLED (requester)
//
// This file answers only "may someone with this ROLE move a request from A to B?".
// Whether the caller is the right PERSON (the owner, or the assigned officer) is
// checked in RequestsService, because that needs the database.
//
// Pure functions with no dependencies: easy to read, easy to test exhaustively.

interface Transition {
  roles: readonly RoleName[];
  noteRequired?: boolean;
}

const TRANSITIONS: Partial<
  Record<RequestStatus, Partial<Record<RequestStatus, Transition>>>
> = {
  PENDING: {
    ASSIGNED: { roles: ['ADMIN'] },
    REJECTED: { roles: ['ADMIN'], noteRequired: true }, // the requester deserves a reason
    CANCELLED: { roles: ['REQUESTER'] },
  },
  ASSIGNED: {
    ASSIGNED: { roles: ['ADMIN'] }, // reassignment to another officer
    IN_PROGRESS: { roles: ['OFFICER'] },
  },
  IN_PROGRESS: {
    COMPLETED: { roles: ['OFFICER'] },
  },
  COMPLETED: {
    IN_PROGRESS: { roles: ['ADMIN'], noteRequired: true }, // reopen: say what is still wrong
  },
  // REJECTED and CANCELLED have no entries: they are final.
};

export type TransitionCheck =
  | { allowed: true; noteRequired: boolean }
  | { allowed: false; reason: 'INVALID_TRANSITION' | 'WRONG_ROLE' };

export function checkTransition(
  from: RequestStatus,
  to: RequestStatus,
  role: RoleName,
): TransitionCheck {
  const transition = TRANSITIONS[from]?.[to];
  // The move does not exist for anyone, e.g. PENDING → COMPLETED.
  if (!transition) return { allowed: false, reason: 'INVALID_TRANSITION' };
  // The move exists, but not for this role.
  if (!transition.roles.includes(role)) {
    return { allowed: false, reason: 'WRONG_ROLE' };
  }
  return { allowed: true, noteRequired: transition.noteRequired ?? false };
}

// The statuses a request can move to next, for anyone. Used in error messages.
export function nextStatuses(from: RequestStatus): RequestStatus[] {
  return Object.keys(TRANSITIONS[from] ?? {}) as RequestStatus[];
}

// A request that is finished or abandoned. Used to stop edits and uploads.
export function isClosed(status: RequestStatus): boolean {
  return (
    status === RequestStatus.COMPLETED ||
    status === RequestStatus.REJECTED ||
    status === RequestStatus.CANCELLED
  );
}
