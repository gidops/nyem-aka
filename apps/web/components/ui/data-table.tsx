import Link from "next/link";
import { cn } from "./cn";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  // Shown as the heading of the card on small screens (usually the title column).
  primary?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  // When given, the primary cell links to this address.
  rowHref?: (row: T) => string;
  caption: string;
  // Dims the rows while a new page or filter is loading.
  stale?: boolean;
}

// One set of column definitions, two layouts:
//  - md and up: a real <table>, the right element for comparing rows.
//  - below md: a stack of cards, because a wide table on a phone forces sideways
//    scrolling and hides columns.
export function DataTable<T>({ columns, rows, rowKey, rowHref, caption, stale }: DataTableProps<T>) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const rest = columns.filter((column) => column !== primary);

  const primaryCell = (row: T) =>
    rowHref ? (
      <Link href={rowHref(row)} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
        {primary.cell(row)}
      </Link>
    ) : (
      <span className="font-medium">{primary.cell(row)}</span>
    );

  return (
    <div className={cn("transition-opacity", stale && "opacity-60")} aria-busy={stale}>
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-canvas text-xs tracking-wide text-muted uppercase">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className={cn("px-4 py-3 font-semibold", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-canvas">
                {columns.map((column) => (
                  <td key={column.header} className={cn("px-4 py-3 align-middle", column.className)}>
                    {column === primary ? primaryCell(row) : column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 text-base">{primaryCell(row)}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {rest.map((column) => (
                <div key={column.header} className="contents">
                  <dt className="text-muted">{column.header}</dt>
                  <dd className="min-w-0 break-words">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
