import { Prisma } from '../generated/prisma/client.js';

// The only user fields that may ever leave the API. Every user query selects through
// this, so `passwordHash` and `refreshTokenHash` cannot leak by accident.
export const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  department: true,
  isActive: true,
  createdAt: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUser = Omit<PublicUserRow, 'role'> & {
  role: PublicUserRow['role']['name'];
};

// Flattens `{ role: { name: 'ADMIN' } }` to `{ role: 'ADMIN' }` for a simpler response.
export function toPublicUser(row: PublicUserRow): PublicUser {
  return { ...row, role: row.role.name };
}
