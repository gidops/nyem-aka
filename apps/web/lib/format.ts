import type { Priority, RequestStatus, RoleName } from "./types";

// Human wording for the values the API returns, kept in one place.

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const ROLE_LABELS: Record<RoleName, string> = {
  REQUESTER: "Student / Staff",
  OFFICER: "Maintenance officer",
  ADMIN: "Administrator",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return "No data yet";
  if (hours < 1 / 60) return "Under 1 min";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

// Where each role lands after signing in.
export const HOME_BY_ROLE: Record<RoleName, string> = {
  REQUESTER: "/requests",
  OFFICER: "/officer",
  ADMIN: "/admin",
};
