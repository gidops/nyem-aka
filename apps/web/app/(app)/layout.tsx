import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Loading } from "@/components/ui/states";

// Everything under app/(app)/ is for signed-in users and shares this shell
// (header, navigation, current user). The parentheses make "(app)" a route group:
// it organises files without adding "/app" to the address.
//
// The Suspense boundaries are required because the shell and pages read the
// address (path, ?filters) in the browser; Next.js renders the fallback first.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const fallback = (
    <div className="flex flex-1 items-center justify-center">
      <Loading size="page" />
    </div>
  );
  return (
    <Suspense fallback={fallback}>
      <AppShell>
        <Suspense fallback={fallback}>{children}</Suspense>
      </AppShell>
    </Suspense>
  );
}
