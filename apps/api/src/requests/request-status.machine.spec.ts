import { RequestStatus, RoleName } from '../generated/prisma/client.js';
import {
  checkTransition,
  isClosed,
  nextStatuses,
} from './request-status.machine.js';

const statuses = Object.values(RequestStatus);
const roles = Object.values(RoleName);

// The complete list of allowed moves. Anything not listed here must be refused.
const ALLOWED: [RequestStatus, RequestStatus, RoleName][] = [
  ['PENDING', 'ASSIGNED', 'ADMIN'],
  ['PENDING', 'REJECTED', 'ADMIN'],
  ['PENDING', 'CANCELLED', 'REQUESTER'],
  ['ASSIGNED', 'ASSIGNED', 'ADMIN'],
  ['ASSIGNED', 'IN_PROGRESS', 'OFFICER'],
  ['IN_PROGRESS', 'COMPLETED', 'OFFICER'],
  ['COMPLETED', 'IN_PROGRESS', 'ADMIN'],
];

const isAllowed = (from: RequestStatus, to: RequestStatus, role: RoleName) =>
  ALLOWED.some(([f, t, r]) => f === from && t === to && r === role);

describe('request status machine', () => {
  it.each(ALLOWED)('allows %s → %s for %s', (from, to, role) => {
    expect(checkTransition(from, to, role).allowed).toBe(true);
  });

  // Every combination of from × to × role (6 × 6 × 3 = 108), minus the 7 allowed ones.
  it('refuses every combination that is not explicitly allowed', () => {
    let refused = 0;
    for (const from of statuses) {
      for (const to of statuses) {
        for (const role of roles) {
          if (isAllowed(from, to, role)) continue;
          expect(
            checkTransition(from, to, role).allowed,
            `${from} → ${to} as ${role} should be refused`,
          ).toBe(false);
          refused += 1;
        }
      }
    }
    expect(refused).toBe(statuses.length ** 2 * roles.length - ALLOWED.length);
  });

  it('distinguishes an impossible move from a move the role may not make', () => {
    expect(checkTransition('PENDING', 'COMPLETED', 'ADMIN')).toEqual({
      allowed: false,
      reason: 'INVALID_TRANSITION',
    });
    expect(checkTransition('ASSIGNED', 'IN_PROGRESS', 'REQUESTER')).toEqual({
      allowed: false,
      reason: 'WRONG_ROLE',
    });
  });

  it('requires a note for rejecting and reopening only', () => {
    const noteRequired = ALLOWED.filter(([from, to, role]) => {
      const check = checkTransition(from, to, role);
      return check.allowed && check.noteRequired;
    }).map(([from, to]) => `${from}→${to}`);
    expect(noteRequired).toEqual(['PENDING→REJECTED', 'COMPLETED→IN_PROGRESS']);
  });

  it('treats REJECTED and CANCELLED as final', () => {
    expect(nextStatuses('REJECTED')).toEqual([]);
    expect(nextStatuses('CANCELLED')).toEqual([]);
  });

  it('knows which statuses are closed', () => {
    expect(statuses.filter(isClosed)).toEqual([
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ]);
  });
});
