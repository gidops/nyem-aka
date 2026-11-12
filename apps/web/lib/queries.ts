"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, toQuery } from "./api";
import { currentUser } from "./auth";
import type {
  AuditLog,
  Category,
  Paginated,
  ReportSummary,
  RequestDetail,
  RequestListItem,
  User,
} from "./types";

// Every piece of server data the app reads, as a hook.
//
// TanStack Query caches each result under its "query key". Two components asking
// for the same key share one request, and after a change we "invalidate" a key to
// make everything showing that data refetch. Keeping the keys here, in one object,
// means a page and the mutation that should refresh it can never disagree.

export const keys = {
  me: ["me"] as const,
  categories: ["categories"] as const,
  requests: ["requests"] as const,
  request: (id: string) => ["requests", "detail", id] as const,
  users: ["users"] as const,
  summary: ["summary"] as const,
  audit: ["audit"] as const,
};

type Params = Record<string, string | number | undefined | null>;

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: currentUser, staleTime: 5 * 60_000 });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api<Category[]>("/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useRequests(params: Params, enabled = true) {
  return useQuery({
    queryKey: [...keys.requests, "list", params],
    queryFn: () => api<Paginated<RequestListItem>>(`/requests${toQuery(params)}`),
    // While the next page or filter loads, keep showing the current rows
    // instead of flashing an empty table.
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: keys.request(id),
    queryFn: () => api<RequestDetail>(`/requests/${id}`),
  });
}

export function useUsers(params: Params, enabled = true) {
  return useQuery({
    queryKey: [...keys.users, params],
    queryFn: () => api<Paginated<User>>(`/users${toQuery(params)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSummary() {
  return useQuery({
    queryKey: keys.summary,
    queryFn: () => api<ReportSummary>("/reports/summary"),
  });
}

export function useAuditLogs(params: Params) {
  return useQuery({
    queryKey: [...keys.audit, params],
    queryFn: () => api<Paginated<AuditLog>>(`/audit-logs${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}
