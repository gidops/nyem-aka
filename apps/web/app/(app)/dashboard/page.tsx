"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/components/app-shell";
import { Loading } from "@/components/ui/states";
import { HOME_BY_ROLE } from "@/lib/format";

// /dashboard is the neutral "send me home" address used after signing in.
// It forwards each role to its own starting page.
export default function DashboardRedirect() {
  const user = useUser();
  const router = useRouter();
  useEffect(() => {
    router.replace(HOME_BY_ROLE[user.role]);
  }, [router, user.role]);
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loading />
    </div>
  );
}
