"use client";

import { RoleGate } from "@/components/app-shell";
import { RequestTable } from "@/components/requests/request-table";
import { SearchBox } from "@/components/requests/search-box";
import { Hero, PageBody } from "@/components/ui/hero";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { errorText } from "@/lib/api";
import { useRequests } from "@/lib/queries";
import type { RequestStatus } from "@/lib/types";
import { useUrlState } from "@/lib/use-url-state";

const TABS: { value: RequestStatus; label: string; empty: string }[] = [
  { value: "ASSIGNED", label: "To start", empty: "Nothing waiting to be started." },
  { value: "IN_PROGRESS", label: "In progress", empty: "You have no work in progress." },
  { value: "COMPLETED", label: "Completed", empty: "Completed work will be listed here." },
];

function MyWork() {
  const url = useUrlState();
  const tab = TABS.find((item) => item.value === url.get("tab")) ?? TABS[0];
  const q = url.get("q");

  // The API only ever returns requests assigned to the signed-in officer.
  // Most urgent first while work is outstanding.
  const requests = useRequests({
    status: tab.value,
    q,
    page: url.page,
    limit: 10,
    sort: tab.value === "COMPLETED" ? "newest" : "priority",
  });

  // One tiny query per tab (limit=1) just to read its total for the counter.
  const toStart = useRequests({ status: "ASSIGNED", limit: 1 });
  const inProgress = useRequests({ status: "IN_PROGRESS", limit: 1 });
  const completed = useRequests({ status: "COMPLETED", limit: 1 });
  const counts: Record<string, number | undefined> = {
    ASSIGNED: toStart.data?.meta.total,
    IN_PROGRESS: inProgress.data?.meta.total,
    COMPLETED: completed.data?.meta.total,
  };

  return (
    <>
      <Hero title="My work" description="Requests assigned to you, most urgent first." />
      <PageBody>
        <Tabs
          label="Filter by progress"
          tabs={TABS.map((item) => ({ value: item.value, label: item.label, count: counts[item.value] }))}
          value={tab.value}
          onChange={(value) => url.set({ tab: value === TABS[0].value ? undefined : value })}
        />
        <SearchBox defaultValue={q} onSearch={(value) => url.set({ q: value })} />

        {requests.isPending ? (
          <Loading />
        ) : requests.isError ? (
          <ErrorState message={errorText(requests.error)} onRetry={() => requests.refetch()} />
        ) : requests.data.data.length === 0 ? (
          <EmptyState
            title={q ? "Nothing matches your search" : tab.empty}
            description={q ? "Try a different word, or clear the search." : undefined}
          />
        ) : (
          <>
            <RequestTable rows={requests.data.data} stale={requests.isPlaceholderData} showRequester />
            <Pagination {...requests.data.meta} onChange={(page) => url.set({ page })} />
          </>
        )}
      </PageBody>
    </>
  );
}

export default function OfficerPage() {
  return (
    <RoleGate allow={["OFFICER"]}>
      <MyWork />
    </RoleGate>
  );
}
