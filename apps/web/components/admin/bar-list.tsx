import Link from "next/link";

export interface BarItem {
  label: string;
  value: number;
  href?: string;
}

// A horizontal bar chart drawn with plain HTML: one row per item.
//
// Design choices:
//  - Bars compare sizes, so they all use ONE colour. Colour is not asked to carry
//    meaning; the label names each row.
//  - The number is printed on every row in normal text, so the chart is readable
//    without judging bar lengths, by screen readers, and when printed in grey.
//  - Every bar starts from the same left edge and is scaled against the largest
//    value, so lengths are honestly comparable.
export function BarList({ items, total }: { items: BarItem[]; total: number }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.label} title={`${item.label}: ${item.value} (${share}% of all requests)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              {item.href ? (
                <Link href={item.href} className="underline decoration-line-strong underline-offset-4 hover:decoration-accent">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
              <span className="tabular-nums">
                <span className="font-semibold">{item.value}</span>
                <span className="text-muted"> · {share}%</span>
              </span>
            </div>
            <div aria-hidden className="h-2 rounded-sm bg-neutral-soft">
              <div
                className="h-2 rounded-sm bg-accent"
                // A non-zero value always gets a visible sliver.
                style={{ width: item.value === 0 ? 0 : `max(4px, ${(item.value / max) * 100}%)` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
