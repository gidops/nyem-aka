import { StatusBadge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icons";
import type { RequestStatus } from "@/lib/types";

// The artwork on the sign-in and create-account pages. Everything here is drawn in
// code from the design tokens (no image files), so it stays sharp at any size, adds
// nothing to download, and changes with the palette. It is decoration only, so all
// of it is hidden from screen readers.

const CARDS: { icon: IconName; title: string; place: string; status: RequestStatus; shift: string }[] = [
  { icon: "camera", title: "Leaking tap", place: "Block C · Ground floor", status: "IN_PROGRESS", shift: "" },
  { icon: "assign", title: "Broken wall socket", place: "Library · Room 204", status: "ASSIGNED", shift: "ml-10" },
  { icon: "check", title: "Flickering light", place: "Hostel A · 2nd floor", status: "COMPLETED", shift: "ml-20" },
];

// Three sample requests at different stages, stepped to the right like a staircase:
// a picture of what the product does (a fault moving towards "completed").
export function RequestStack() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {CARDS.map((card) => (
        <div
          key={card.title}
          className={`flex w-80 items-center gap-3 rounded-xl border border-line bg-surface p-3 text-ink ${card.shift}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Icon name={card.icon} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{card.title}</span>
            <span className="text-xs text-muted">{card.place}</span>
          </span>
          <StatusBadge status={card.status} />
        </div>
      ))}
    </div>
  );
}

// Faint concentric rings with the spanner's jaw shape at the centre. Sits behind
// content, positioned by the parent (which must be `relative overflow-hidden`).
// It draws in the current text colour, so it works on light and dark backgrounds.
export function Rings({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      className={`pointer-events-none absolute ${className ?? ""}`}
    >
      {[60, 105, 150, 195].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r} strokeWidth="1.5" opacity={0.28 - i * 0.05} />
      ))}
      <path
        d="M228 200a28 28 0 1 1-28-28"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.22"
      />
    </svg>
  );
}
