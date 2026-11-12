"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { ToastProvider } from "@/components/ui/toast";

// Wraps the whole app with the two pieces of shared client state:
// the TanStack Query cache (server data) and the toast messages.
export function Providers({ children }: { children: React.ReactNode }) {
  // useState so the client is created once per browser tab, not on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 30s: moving between pages does not refetch.
            staleTime: 30_000,
            // Retrying "you are not allowed" or "not found" will not change the answer.
            retry: (failures, error) =>
              !(error instanceof ApiError && error.status < 500) && failures < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
