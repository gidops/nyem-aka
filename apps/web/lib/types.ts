// Shapes returned by the API. Kept by hand; they mirror the Swagger docs at /docs.

export type RoleName = "REQUESTER" | "OFFICER" | "ADMIN";

export const REQUEST_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  department: string | null;
  isActive: boolean;
  role: RoleName;
  createdAt: string;
}

export interface Person {
  id: string;
  fullName: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface RequestListItem {
  id: string;
  number: number;
  reference: string;
  title: string;
  location: string;
  priority: Priority;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  category: { id: number; name: string };
  requester: Person;
  assignedOfficer: Person | null;
  attachmentCount: number;
}

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: Person;
}

export interface TimelineEntry {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  createdAt: string;
  changedBy: Person & { role: RoleName };
}

export interface Assignment {
  id: string;
  note: string | null;
  isActive: boolean;
  assignedAt: string;
  unassignedAt: string | null;
  officer: Person;
  assignedBy: Person;
}

export interface RequestDetail extends Omit<RequestListItem, "requester" | "attachmentCount"> {
  description: string;
  requester: Person & { email: string; department: string | null };
  assignments: Assignment[];
  timeline: TimelineEntry[];
  attachments: Attachment[];
}

export interface RequestInput {
  title: string;
  description: string;
  location: string;
  categoryId: number;
  priority: Priority;
}

export interface ReportSummary {
  total: number;
  open: number;
  byStatus: Record<RequestStatus, number>;
  byPriority: Record<Priority, number>;
  byCategory: { id: number; name: string; count: number }[];
  averageCompletionHours: number | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: (Person & { email: string }) | null;
}
