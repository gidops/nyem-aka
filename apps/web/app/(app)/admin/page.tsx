"use client";

import Link from "next/link";
import { BarList } from "@/components/admin/bar-list";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Hero, PageBody } from "@/components/ui/hero";
import { ErrorState, Loading } from "@/components/ui/states";
import { errorText } from "@/lib/api";
import { formatDateTime, formatHours, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/format";
import { useAuditLogs, useSummary } from "@/lib/queries";
import { PRIORITIES, REQUEST_STATUSES } from "@/lib/types";

// A headline number. Not a chart: a single figure is clearest as a big number with a label.
function StatTile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string | number;
  note?: string;
  href?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-4xl font-semibold tabular-nums">{value}</p>
      {note && <p className="text-sm text-muted">{note}</p>}
      {href && (
        <Link href={href} className="mt-1 text-sm font-medium text-accent-strong underline">
          View
        </Link>
      )}
    </Card>
  );
}

export default function AdminOverviewPage() {
  const summary = useSummary();
  const activity = useAuditLogs({ limit: 8 });

  return (
    <>
      <Hero
        title="Overview"
        description="The state of maintenance across campus, right now."
        actions={<ButtonLink href="/admin/requests?status=PENDING">Assign pending requests</ButtonLink>}
      />
      <PageBody>
        {summary.isPending ? (
          <Loading />
        ) : summary.isError ? (
          <ErrorState message={errorText(summary.error)} onRetry={() => summary.refetch()} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="Waiting to be assigned"
                value={summary.data.byStatus.PENDING}
                href="/admin/requests?status=PENDING"
              />
              <StatTile label="Open" value={summary.data.open} note="Pending, assigned or in progress" href="/admin/requests?group=open" />
              <StatTile label="All requests" value={summary.data.total} href="/admin/requests" />
              <StatTile
                label="Average time to complete"
                value={formatHours(summary.data.averageCompletionHours)}
                note="From submission to completion"
              />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card as="section">
                <CardTitle>Requests by status</CardTitle>
                <BarList
                  total={summary.data.total}
                  items={REQUEST_STATUSES.map((status) => ({
                    label: STATUS_LABELS[status],
                    value: summary.data.byStatus[status],
                    href: `/admin/requests?status=${status}`,
                  }))}
                />
              </Card>
              <Card as="section">
                <CardTitle>Requests by category</CardTitle>
                <BarList
                  total={summary.data.total}
                  items={summary.data.byCategory.map((category) => ({
                    label: category.name,
                    value: category.count,
                    href: `/admin/requests?categoryId=${category.id}`,
                  }))}
                />
              </Card>
              <Card as="section">
                <CardTitle>Requests by priority</CardTitle>
                <BarList
                  total={summary.data.total}
                  // Most urgent at the top.
                  items={[...PRIORITIES].reverse().map((priority) => ({
                    label: PRIORITY_LABELS[priority],
                    value: summary.data.byPriority[priority],
                    href: `/admin/requests?priority=${priority}`,
                  }))}
                />
              </Card>

              <Card as="section">
                <CardTitle
                  action={
                    <Link href="/admin/audit" className="text-sm font-medium text-accent-strong underline">
                      Full audit trail
                    </Link>
                  }
                >
                  Recent activity
                </CardTitle>
                {activity.isPending ? (
                  <Loading />
                ) : activity.isError ? (
                  <p className="text-danger">{errorText(activity.error)}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line text-sm">
                    {activity.data.data.map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                        <span>
                          <span className="font-medium">{entry.actor?.fullName ?? "Someone not signed in"}</span>{" "}
                          <code className="rounded bg-neutral-soft px-1.5 py-0.5 text-xs">{entry.action}</code>
                        </span>
                        <time dateTime={entry.createdAt} className="text-muted">
                          {formatDateTime(entry.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
