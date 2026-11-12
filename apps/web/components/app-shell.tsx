"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { errorText } from "@/lib/api";
import { logout } from "@/lib/auth";
import { HOME_BY_ROLE, ROLE_LABELS } from "@/lib/format";
import { useMe } from "@/lib/queries";
import type { RoleName, User } from "@/lib/types";
import { Button, ButtonLink } from "./ui/button";
import { cn } from "./ui/cn";
import { EmptyState, ErrorState, Loading } from "./ui/states";

// The signed-in user, available to every page inside the shell without refetching.
const UserContext = createContext<User | null>(null);

export function useUser(): User {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside <AppShell>");
  return user;
}

// Each role sees only the destinations it can use. This is navigation, not security:
// the API decides what each role may actually do.
const NAV: Record<RoleName, { href: string; label: string }[]> = {
  REQUESTER: [
    { href: "/requests", label: "My requests" },
    { href: "/requests/new", label: "New request" },
  ],
  OFFICER: [{ href: "/officer", label: "My work" }],
  ADMIN: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/audit", label: "Audit trail" },
  ],
};

// Highlights the most specific matching link ("/admin/users" should not also light up "/admin").
function activeHref(pathname: string, links: { href: string }[]): string | undefined {
  return links
    .map((link) => link.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  // `null` means "definitely signed out" (as opposed to still loading).
  useEffect(() => {
    if (me.data === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me.data, pathname, router]);

  if (me.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loading label="Loading your account…" />
      </div>
    );
  }
  if (me.isError) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <ErrorState message={errorText(me.error)} onRetry={() => me.refetch()} />
      </div>
    );
  }
  const user = me.data;
  if (!user) return null; // the effect above is redirecting to /login

  const links = NAV[user.role];
  const current = activeHref(pathname, links);

  async function signOut() {
    await logout().catch(() => undefined);
    // Drop everything cached for this user so the next person never sees it.
    queryClient.clear();
    router.replace("/login");
  }

  const navLink = (link: { href: string; label: string }, mobile: boolean) => (
    <Link
      key={link.href}
      href={link.href}
      onClick={() => setMenuOpen(false)}
      aria-current={link.href === current ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center rounded-full px-4 text-sm font-medium",
        link.href === current ? "bg-accent-soft text-accent-strong" : "text-ink hover:bg-neutral-soft",
        mobile && "text-base",
      )}
    >
      {link.label}
    </Link>
  );

  return (
    <UserContext.Provider value={user}>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href={HOME_BY_ROLE[user.role]} className="font-display text-xl font-semibold">
            Nyem Aka
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
            {links.map((link) => navLink(link, false))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{user.fullName}</p>
              <p className="text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>

          <button
            type="button"
            className="ml-auto flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {/* Below lg the navigation becomes a panel that drops down from the header. */}
        {menuOpen && (
          <div id="mobile-menu" className="border-t border-line bg-canvas px-4 py-4 lg:hidden">
            <nav aria-label="Main" className="flex flex-col gap-1">
              {links.map((link) => navLink(link, true))}
            </nav>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
              <div className="min-w-0 text-sm leading-tight">
                <p className="truncate font-medium">{user.fullName}</p>
                <p className="text-muted">{ROLE_LABELS[user.role]}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </UserContext.Provider>
  );
}

// Shows its children only to the listed roles. Someone who types /admin into the
// address bar as a requester gets a clear message instead of a page of failed requests.
export function RoleGate({ allow, children }: { allow: RoleName[]; children: React.ReactNode }) {
  const user = useUser();
  if (allow.includes(user.role)) return <>{children}</>;
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        title="You do not have access to this page"
        description={`This area is for ${allow.map((role) => ROLE_LABELS[role].toLowerCase()).join(" or ")} accounts.`}
        action={<ButtonLink href={HOME_BY_ROLE[user.role]}>Go to my home page</ButtonLink>}
      />
    </div>
  );
}
