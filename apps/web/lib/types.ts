// Shapes returned by the API. Kept by hand for now; they mirror the Swagger docs at /docs.

export type RoleName = "REQUESTER" | "OFFICER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  fullName: string;
  department: string | null;
  isActive: boolean;
  role: RoleName;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
