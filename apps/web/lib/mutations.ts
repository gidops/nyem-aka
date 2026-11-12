"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { keys } from "./queries";
import type { Attachment, RequestDetail, RequestInput, RequestStatus } from "./types";

// Changes to requests. After any of them succeeds, everything that shows request
// data is told to refetch: lists, the detail page, and the admin's numbers.
// (Invalidating ["requests"] covers every key that starts with it.)
function useRefreshRequests() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.requests }),
      queryClient.invalidateQueries({ queryKey: keys.summary }),
      queryClient.invalidateQueries({ queryKey: keys.audit }),
    ]);
}

export function uploadAttachment(requestId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return api<Attachment>(`/requests/${requestId}/attachments`, { method: "POST", body });
}

export function useCreateRequest() {
  const refresh = useRefreshRequests();
  return useMutation({
    // Creates the request, then uploads the photos one at a time. A failed photo
    // does not undo the request: the caller is told how many did not upload.
    mutationFn: async ({ values, files }: { values: RequestInput; files: File[] }) => {
      const request = await api<RequestDetail>("/requests", { method: "POST", body: values });
      let failedUploads = 0;
      for (const file of files) {
        try {
          await uploadAttachment(request.id, file);
        } catch {
          failedUploads += 1;
        }
      }
      return { request, failedUploads };
    },
    onSettled: refresh,
  });
}

export function useUpdateRequest(id: string) {
  const refresh = useRefreshRequests();
  return useMutation({
    mutationFn: (values: RequestInput) =>
      api<RequestDetail>(`/requests/${id}`, { method: "PATCH", body: values }),
    onSettled: refresh,
  });
}

export function useChangeStatus(id: string) {
  const refresh = useRefreshRequests();
  return useMutation({
    mutationFn: ({ status, note }: { status: RequestStatus; note?: string }) =>
      status === "CANCELLED"
        ? api<RequestDetail>(`/requests/${id}/cancel`, { method: "POST" })
        : api<RequestDetail>(`/requests/${id}/status`, {
            method: "PATCH",
            body: { status, ...(note && { note }) },
          }),
    // onSettled (not onSuccess): if the change failed because someone else got there
    // first, refetching is exactly what shows the user the current state.
    onSettled: refresh,
  });
}

export function useAssignRequest() {
  const refresh = useRefreshRequests();
  return useMutation({
    mutationFn: ({ id, officerId, note }: { id: string; officerId: string; note?: string }) =>
      api<RequestDetail>(`/requests/${id}/assign`, {
        method: "POST",
        body: { officerId, ...(note && { note }) },
      }),
    onSettled: refresh,
  });
}

export function useUploadAttachments(requestId: string) {
  const refresh = useRefreshRequests();
  return useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadAttachment(requestId, file);
    },
    onSettled: refresh,
  });
}

export function useRemoveAttachment() {
  const refresh = useRefreshRequests();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api<{ success: boolean }>(`/attachments/${attachmentId}`, { method: "DELETE" }),
    onSettled: refresh,
  });
}
