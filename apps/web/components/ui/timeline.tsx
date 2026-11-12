import { formatDateTime, ROLE_LABELS, STATUS_LABELS } from "@/lib/format";
import type { TimelineEntry } from "@/lib/types";

// The history of a request, oldest first: who moved it, to what, when, and why.
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* The line joining this dot to the next one. */}
            {!last && <span aria-hidden className="absolute top-4 bottom-0 left-[7px] w-px bg-line-strong" />}
            <span
              aria-hidden
              className={`relative mt-1 size-[15px] shrink-0 rounded-full border-2 ${
                last ? "border-accent bg-accent" : "border-line-strong bg-surface"
              }`}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium">
                {entry.fromStatus === null
                  ? "Request submitted"
                  : entry.fromStatus === entry.toStatus
                    ? "Reassigned"
                    : `${STATUS_LABELS[entry.fromStatus]} → ${STATUS_LABELS[entry.toStatus]}`}
              </p>
              <p className="text-sm text-muted">
                {entry.changedBy.fullName} ({ROLE_LABELS[entry.changedBy.role]}) ·{" "}
                <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
              </p>
              {entry.note && entry.fromStatus !== null && (
                <p className="rounded-lg bg-canvas px-3 py-2 text-sm break-words">{entry.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
