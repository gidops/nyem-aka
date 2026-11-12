"use client";

import Link from "next/link";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/field";
import { Hero, PageBody } from "@/components/ui/hero";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { errorText } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAuditLogs } from "@/lib/queries";
import type { AuditLog } from "@/lib/types";
import { useUrlState } from "@/lib/use-url-state";

// Actions are named "<area>.<event>", so filtering by the prefix selects an area.
const AREAS = [
  { value: "auth.", label: "Sign-ins and sign-outs" },
  { value: "request.", label: "Requests" },
  { value: "attachment.", label: "Photos" },
  { value: "user.", label: "User management" },
  { value: "category.", label: "Categories" },
  { value: "report.", label: "Exports" },
];

function details(entry: AuditLog): string {
  if (!entry.metadata) return "";
  return Object.entries(entry.metadata)
    .filter(([, value]) => value !== null && typeof value !== "object")
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

const columns: Column<AuditLog>[] = [
  {
    header: "When",
    cell: (entry) => <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>,
    className: "whitespace-nowrap",
  },
  {
    header: "Action",
    primary: true,
    cell: (entry) => <code className="rounded bg-neutral-soft px-1.5 py-0.5 text-xs font-normal">{entry.action}</code>,
  },
  {
    header: "Who",
    cell: (entry) =>
      entry.actor ? (
        <>
          {entry.actor.fullName}
          <span className="block text-xs break-all text-muted">{entry.actor.email}</span>
        </>
      ) : (
        <span className="text-muted">Not signed in</span>
      ),
  },
  {
    header: "On",
    cell: (entry) =>
      entry.entity === "ServiceRequest" && entry.entityId ? (
        <Link href={`/requests/${entry.entityId}`} className="underline decoration-line-strong underline-offset-4">
          Request
        </Link>
      ) : (
        entry.entity
      ),
  },
  { header: "Details", cell: (entry) => details(entry) || <span className="text-muted">—</span> },
  { header: "IP address", cell: (entry) => entry.ip ?? <span className="text-muted">—</span> },
];

export default function AdminAuditPage() {
  const url = useUrlState();
  const action = url.get("action");
  const from = url.get("from");
  const to = url.get("to");
  // The API treats "to" as an exact moment, so a date means the end of that day.
  const logs = useAuditLogs({ action, from, to: to && `${to}T23:59:59.999Z`, page: url.page, limit: 20 });

  return (
    <>
      <Hero
        title="Audit trail"
        description="A permanent record of who did what, and when. Entries cannot be edited or deleted."
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Area" value={action} onChange={(event) => url.set({ action: event.target.value })}>
            <option value="">Everything</option>
            {AREAS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </Select>
          <Input label="From" type="date" value={from} max={to || undefined} onChange={(event) => url.set({ from: event.target.value })} />
          <Input label="To" type="date" value={to} min={from || undefined} onChange={(event) => url.set({ to: event.target.value })} />
        </div>

        {logs.isPending ? (
          <Loading />
        ) : logs.isError ? (
          <ErrorState message={errorText(logs.error)} onRetry={() => logs.refetch()} />
        ) : logs.data.data.length === 0 ? (
          <EmptyState title="No entries match" description="Try a wider date range or a different area." />
        ) : (
          <>
            <DataTable caption="Audit trail" columns={columns} rows={logs.data.data} rowKey={(entry) => entry.id} stale={logs.isPlaceholderData} />
            <Pagination {...logs.data.meta} onChange={(page) => url.set({ page })} />
          </>
        )}
      </PageBody>
    </>
  );
}
