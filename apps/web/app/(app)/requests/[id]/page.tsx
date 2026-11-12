"use client";

import { useParams } from "next/navigation";
import { useUser } from "@/components/app-shell";
import { RequestActions } from "@/components/requests/request-actions";
import { RequestPhotos } from "@/components/requests/request-photos";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Hero, PageBody } from "@/components/ui/hero";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { Timeline } from "@/components/ui/timeline";
import { ApiError, errorText } from "@/lib/api";
import { formatDateTime, HOME_BY_ROLE } from "@/lib/format";
import { useRequest } from "@/lib/queries";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

// One page for all three roles. What differs is which actions are offered,
// and that is decided by role and status in <RequestActions>.
export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();
  const request = useRequest(id);
  const home = user.role === "ADMIN" ? "/admin/requests" : HOME_BY_ROLE[user.role];

  if (request.isPending) {
    return (
      <PageBody>
        <Loading label="Loading request…" />
      </PageBody>
    );
  }
  if (request.isError) {
    // 404 covers both "no such request" and "not one you may see".
    const missing = request.error instanceof ApiError && request.error.status === 404;
    return (
      <PageBody width="narrow">
        {missing ? (
          <EmptyState
            title="Request not found"
            description="It may not exist, or it is not one you have access to."
            action={<ButtonLink href={home}>Back to requests</ButtonLink>}
          />
        ) : (
          <ErrorState message={errorText(request.error)} onRetry={() => request.refetch()} />
        )}
      </PageBody>
    );
  }

  const data = request.data;
  return (
    <>
      <Hero
        eyebrow={data.reference}
        title={data.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <PriorityBadge priority={data.priority} />
            <span className="text-sm">{data.category.name}</span>
          </span>
        }
        actions={<RequestActions request={data} />}
      />
      <PageBody>
        <ButtonLink href={home} variant="ghost" size="sm" className="self-start">
          ← Back to requests
        </ButtonLink>

        {/* Two columns on a wide screen; a single column on a phone, details first. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-6">
            <Card as="section">
              <CardTitle>Details</CardTitle>
              <p className="mb-5 break-words whitespace-pre-wrap">{data.description}</p>
              <dl className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                <Fact label="Location">{data.location}</Fact>
                <Fact label="Assigned officer">
                  {data.assignedOfficer?.fullName ?? <span className="text-muted">Not yet assigned</span>}
                </Fact>
                <Fact label="Reported by">
                  {data.requester.fullName}
                  {data.requester.department && (
                    <span className="text-muted"> · {data.requester.department}</span>
                  )}
                  <span className="block text-sm text-muted">{data.requester.email}</span>
                </Fact>
                <Fact label="Submitted">{formatDateTime(data.createdAt)}</Fact>
                {data.completedAt && <Fact label="Completed">{formatDateTime(data.completedAt)}</Fact>}
              </dl>
            </Card>

            <RequestPhotos request={data} />
          </div>

          <div className="flex flex-col gap-6">
            <Card as="section">
              <CardTitle>Timeline</CardTitle>
              <Timeline entries={data.timeline} />
            </Card>

            {user.role === "ADMIN" && data.assignments.length > 0 && (
              <Card as="section">
                <CardTitle>Assignment history</CardTitle>
                <ul className="flex flex-col divide-y divide-line">
                  {data.assignments.map((assignment) => (
                    <li key={assignment.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                      <p className="font-medium">
                        {assignment.officer.fullName}
                        {assignment.isActive && (
                          <span className="ml-2 text-sm font-normal text-success">Current</span>
                        )}
                      </p>
                      <p className="text-sm text-muted">
                        Assigned by {assignment.assignedBy.fullName} on {formatDateTime(assignment.assignedAt)}
                        {assignment.unassignedAt && ` · until ${formatDateTime(assignment.unassignedAt)}`}
                      </p>
                      {assignment.note && <p className="text-sm break-words">“{assignment.note}”</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
