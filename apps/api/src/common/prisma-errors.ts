import { Prisma } from '../generated/prisma/client.js';

// P2002 is Prisma's code for "unique constraint failed" (e.g. the email is taken).
// Letting the database enforce uniqueness is safer than checking first, because
// two simultaneous requests could both pass a check.
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
