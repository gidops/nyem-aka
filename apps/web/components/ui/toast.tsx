"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "./cn";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Brief confirmations ("Request submitted") that appear without interrupting.
// Usage: const toast = useToast(); toast.success("Saved");
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    // Errors stay longer: they usually need reading twice.
    setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      tone === "error" ? 7000 : 4000,
    );
  }, []);

  const value = useMemo<ToastApi>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live makes screen readers announce new messages. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className={cn(
              "pointer-events-auto max-w-sm rounded-lg border px-4 py-3 text-sm font-medium",
              toast.tone === "success"
                ? "border-success/40 bg-success-soft text-success"
                : "border-danger/40 bg-danger-soft text-danger",
            )}
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
