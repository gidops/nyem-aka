"use client";

import { useState } from "react";
import { AssignModal } from "@/components/requests/assign-modal";
import { RequestTable } from "@/components/requests/request-table";
import { SearchBox } from "@/components/requests/search-box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Hero, PageBody } from "@/components/ui/hero";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiDownload, errorText, toQuery } from "@/lib/api";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/format";
import { useCategories, useRequests } from "@/lib/queries";
import { PRIORITIES, REQUEST_STATUSES, type RequestListItem } from "@/lib/types";
import { useUrlState } from "@/lib/use-url-state";

const FILTER_KEYS = ["q", "status", "group", "priority", "categoryId", "from", "to", "sort"] as const;

export default function AdminRequestsPage() {
  const url = useUrlState();
  const toast = useToast();
  const categories = useCategories();
  const [assigning, setAssigning] = useState<RequestListItem | null>(null);
  const [exporting, setExporting] = useState(false);

  // Every filter lives in the address bar; this object is just a view of it.
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, url.get(key)])) as Record<
    (typeof FILTER_KEYS)[number],
    string
  >;
  const active = FILTER_KEYS.filter((key) => key !== "sort" && filters[key] !== "").length;
  const requests = useRequests({ ...filters, page: url.page, limit: 15 });

  async function exportCsv() {
    setExporting(true);
    try {
      // The same filters as the table, so the file contains what is on screen
      // (all pages of it, not just the current one).
      await apiDownload(`/reports/requests.csv${toQuery(filters)}`, "nyem-aka-requests.csv");
      toast.success("CSV downloaded");
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Hero
        title="All requests"
        description="Search, filter, assign and export."
        actions={
          <Button variant="secondary" onClick={exportCsv} pending={exporting}>
            Export CSV
          </Button>
        }
      />
      <PageBody>
        <Card className="flex flex-col gap-4">
          <SearchBox defaultValue={filters.q} onSearch={(value) => url.set({ q: value })} />
          {/* Two columns even on a phone, so the filters do not push the results off screen. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Select
              label="Status"
              // "group" (open/closed) comes from dashboard links; choosing a status replaces it.
              value={filters.status || (filters.group ? `group:${filters.group}` : "")}
              onChange={(event) => {
                const value = event.target.value;
                url.set(
                  value.startsWith("group:")
                    ? { group: value.slice(6), status: undefined }
                    : { status: value, group: undefined },
                );
              }}
            >
              <option value="">Any status</option>
              <option value="group:open">All open</option>
              <option value="group:closed">All closed</option>
              {REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Select label="Category" value={filters.categoryId} onChange={(event) => url.set({ categoryId: event.target.value })}>
              <option value="">Any category</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select label="Priority" value={filters.priority} onChange={(event) => url.set({ priority: event.target.value })}>
              <option value="">Any priority</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
            <Input label="From" type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => url.set({ from: event.target.value })} />
            <Input label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => url.set({ to: event.target.value })} />
            <Select label="Sort by" value={filters.sort || "newest"} onChange={(event) => url.set({ sort: event.target.value === "newest" ? undefined : event.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Most urgent first</option>
            </Select>
          </div>
          {active > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => url.set(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])))}
            >
              Clear {active} {active === 1 ? "filter" : "filters"}
            </Button>
          )}
        </Card>

        {requests.isPending ? (
          <Loading />
        ) : requests.isError ? (
          <ErrorState message={errorText(requests.error)} onRetry={() => requests.refetch()} />
        ) : requests.data.data.length === 0 ? (
          <EmptyState
            title={active > 0 ? "No requests match these filters" : "No requests yet"}
            description={active > 0 ? "Try removing a filter." : "Requests appear here as soon as someone reports a fault."}
          />
        ) : (
          <>
            <RequestTable
              rows={requests.data.data}
              stale={requests.isPlaceholderData}
              showRequester
              showOfficer
              actions={(row) =>
                row.status === "PENDING" || row.status === "ASSIGNED" ? (
                  <Button variant="secondary" size="sm" onClick={() => setAssigning(row)}>
                    {row.assignedOfficer ? "Reassign" : "Assign"}
                  </Button>
                ) : (
                  <span className="text-muted">—</span>
                )
              }
            />
            <Pagination {...requests.data.meta} onChange={(page) => url.set({ page })} />
          </>
        )}
      </PageBody>

      <AssignModal request={assigning} onClose={() => setAssigning(null)} />
    </>
  );
}
