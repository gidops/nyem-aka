"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { currentUser, logout } from "@/lib/auth";
import type { Paginated, User } from "@/lib/types";

// Temporary page that proves Phase 2 works from the browser:
// who am I, can I call an admin-only endpoint, and can I sign out.
// Phase 4 replaces it with the real role dashboards.
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminCheck, setAdminCheck] = useState<string | null>(null);

  useEffect(() => {
    currentUser()
      .then((found) => {
        if (found) setUser(found);
        else router.replace("/login");
      })
      .catch(() => setError("Could not reach the server. Is the API running?"));
  }, [router]);

  async function tryAdminRoute() {
    try {
      const users = await api<Paginated<User>>("/users?limit=1");
      setAdminCheck(`200 OK: the API let you in. Total users: ${users.meta.total}.`);
    } catch (cause) {
      setAdminCheck(
        cause instanceof ApiError
          ? `${cause.status}: ${cause.message}`
          : "Request failed",
      );
    }
  }

  async function signOut() {
    await logout().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <main className="flex-1 bg-neutral-50 px-4 py-10 text-neutral-900">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        {error && <p role="alert" className="text-red-800">{error}</p>}
        {!user && !error && <p className="text-neutral-600">Loading…</p>}

        {user && (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-neutral-500">Name</dt>
              <dd>{user.fullName}</dd>
              <dt className="text-neutral-500">Email</dt>
              <dd className="break-all">{user.email}</dd>
              <dt className="text-neutral-500">Role</dt>
              <dd className="font-medium">{user.role}</dd>
            </dl>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={tryAdminRoute}
                className="self-start rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium"
              >
                Call an admin-only endpoint (GET /users)
              </button>
              {adminCheck && <p className="text-sm text-neutral-700">{adminCheck}</p>}
            </div>

            <button
              type="button"
              onClick={signOut}
              className="self-start rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </main>
  );
}
