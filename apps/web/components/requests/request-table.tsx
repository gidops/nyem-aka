import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { formatDate } from "@/lib/format";
import type { RequestListItem } from "@/lib/types";

// The request list used on every role's page. Each page decides which optional
// columns make sense: a requester does not need a "Requester" column.
export function RequestTable({
  rows,
  stale,
  showRequester = false,
  showOfficer = false,
  actions,
}: {
  rows: RequestListItem[];
  stale?: boolean;
  showRequester?: boolean;
  showOfficer?: boolean;
  actions?: (row: RequestListItem) => React.ReactNode;
}) {
  const columns: Column<RequestListItem>[] = [
    {
      header: "Request",
      primary: true,
      cell: (row) => (
        <>
          {row.title}
          <span className="inline-block w-full text-xs font-normal text-muted">
            {row.reference} · {row.location}
          </span>
        </>
      ),
    },
    { header: "Category", cell: (row) => row.category.name },
    { header: "Priority", cell: (row) => <PriorityBadge priority={row.priority} /> },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    ...(showRequester
      ? [{ header: "Requester", cell: (row: RequestListItem) => row.requester.fullName }]
      : []),
    ...(showOfficer
      ? [
          {
            header: "Officer",
            cell: (row: RequestListItem) =>
              row.assignedOfficer?.fullName ?? <span className="text-muted">Unassigned</span>,
          },
        ]
      : []),
    { header: "Submitted", cell: (row) => formatDate(row.createdAt), className: "whitespace-nowrap" },
    ...(actions ? [{ header: "Actions", cell: actions }] : []),
  ];

  return (
    <DataTable
      caption="Maintenance requests"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      rowHref={(row) => `/requests/${row.id}`}
      stale={stale}
    />
  );
}
