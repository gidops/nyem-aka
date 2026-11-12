"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

// Keeps filters, tabs and the page number in the address bar instead of in React
// state. A filtered view can then be bookmarked, shared, and survives a refresh.
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Changing the address is not instant: for a moment after `router.replace`,
  // `searchParams` still holds the OLD address. If a second filter is changed in
  // that moment and built from `searchParams`, it would silently drop the first
  // change. So we remember the address we most recently asked for and build on
  // that until the real one catches up.
  const requested = useRef<string | null>(null);
  useEffect(() => {
    requested.current = null;
  }, [searchParams]);

  const get = useCallback(
    (key: string, fallback = "") => searchParams.get(key) ?? fallback,
    [searchParams],
  );

  const set = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(requested.current ?? searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      // Changing any filter returns to page 1, unless the page itself is being set.
      if (!("page" in updates)) next.delete("page");
      const query = next.toString();
      requested.current = query;
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { get, set, page: Math.max(1, Number(get("page", "1")) || 1) };
}
