"use client";

import { RoleGate } from "@/components/app-shell";
import { RequestTable } from "@/components/requests/request-table";
import { SearchBox } from "@/components/requests/search-box";
import { ButtonLink } from "@/components/ui/button";
import { Hero, PageBody } from "@/components/ui/hero";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { errorText } from "@/lib/api";
import { useRequests } from "@/lib/queries";
import { useUrlState } from "@/lib/use-url-state";

const TABS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
] as const;
type TabValue = (typeof TABS)[number]["value"];

function MyRequests() {
  const url = useUrlState();
  const tab = (TABS.find((item) => item.value === url.get("tab"))?.value ?? "open") as TabValue;
  const q = url.get("q");

  const requests = useRequests({
    group: tab === "all" ? undefined : tab,
    q,
    page: url.page,
    limit: 10,
  });

  return (
    <>
      <Hero
        title="My requests"
        description="Everything you have reported, and where each one stands."
        actions={<ButtonLink href="/requests/new">New request</ButtonLink>}
      />
      <PageBody>
        <Tabs
          label="Filter requests"
          tabs={[...TABS]}
          value={tab}
          onChange={(value) => url.set({ tab: value === "open" ? undefined : value })}
        />
        <SearchBox defaultValue={q} onSearch={(value) => url.set({ q: value })} />

        {requests.isPending ? (
          <Loading />
        ) : requests.isError ? (
          <ErrorState message={errorText(requests.error)} onRetry={() => requests.refetch()} />
        ) : requests.data.data.length === 0 ? (
          <EmptyState
            title={q ? "Nothing matches your search" : tab === "open" ? "No open requests" : "No requests here"}
            description={
              q
                ? "Try a different word, or clear the search."
                : "When you report a fault it will appear here, with its progress."
            }
            action={!q && <ButtonLink href="/requests/new">Report a fault</ButtonLink>}
          />
        ) : (
          <>
            <RequestTable rows={requests.data.data} stale={requests.isPlaceholderData} showOfficer />
            <Pagination {...requests.data.meta} onChange={(page) => url.set({ page })} />
          </>
        )}
      </PageBody>
    </>
  );
}

export default function MyRequestsPage() {
  return (
    <RoleGate allow={["REQUESTER"]}>
      <MyRequests />
    </RoleGate>
  );
}
