import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/format";
import type { Priority, RequestStatus } from "@/lib/types";
import { cn } from "./cn";

type Tone = "neutral" | "accent" | "info" | "warning" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-ink",
  accent: "bg-accent-soft text-accent-strong",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        // The faint outline (in the badge's own colour) keeps it visible on tinted backgrounds.
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-current/25 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// The Record types mean TypeScript refuses to compile if the API gains a status or
// priority that has no colour here. The text label is always shown, so meaning never
// depends on colour alone.
const statusTones: Record<RequestStatus, Tone> = {
  PENDING: "warning",
  ASSIGNED: "info",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

const priorityTones: Record<Priority, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={statusTones[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTones[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
