const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Turns optional "from" / "to" query values into a Prisma date filter.
// "to=2026-11-30" should include everything on the 30th, so a bare date means
// "before the start of the next day"; a full timestamp is used exactly.
export function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: new Date(from) }),
    ...(to &&
      (DATE_ONLY.test(to)
        ? { lt: new Date(new Date(to).getTime() + ONE_DAY_MS) }
        : { lte: new Date(to) })),
  };
}
