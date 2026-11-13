import Link from "next/link";
import { RequestStack, Rings } from "@/components/auth/auth-art";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";

const POINTS = ["Report with a photo", "Follow every step", "Nothing gets lost"];

// Shared by the sign-in and create-account pages.
//
// Wide screens: a terracotta panel with artwork beside the form.
// Phones and tablets: a tinted band with the same ring motif behind the logo, and
// the form card overlapping its lower edge.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="relative hidden overflow-hidden bg-accent text-surface lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:gap-10 lg:p-12">
        <Rings className="-top-10 -right-64 size-[34rem]" />
        <Rings className="-top-56 -left-56 size-[30rem]" />

        <Link href="/" className="relative self-start rounded-lg">
          <Logo tone="inverse" size="lg" />
        </Link>

        <div className="relative flex flex-col gap-8">
          <p className="max-w-md font-display text-4xl font-semibold tracking-tight text-balance">
            Report it once. Watch it get fixed.
          </p>
          <RequestStack />
        </div>

        <ul className="relative flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          {POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <Icon name="check" size={16} />
              {point}
            </li>
          ))}
        </ul>
      </aside>

      <main className="relative flex flex-1 flex-col items-center gap-6 overflow-hidden px-4 py-10 lg:justify-center">
        {/* The tinted band behind the logo (not needed beside the wide-screen panel). */}
        <div className="absolute inset-x-0 top-0 h-56 overflow-hidden border-b border-line bg-accent-soft text-accent lg:hidden">
          <Rings className="-top-24 -right-28 size-80" />
          <Rings className="-bottom-40 -left-32 size-72" />
        </div>
        {/* A quiet echo of the motif in the corner on wide screens. */}
        <Rings className="-right-48 -bottom-48 hidden size-[30rem] text-accent lg:block" />

        <Link href="/" className="relative mt-6 rounded-lg lg:hidden">
          <Logo size="lg" />
        </Link>
        <div className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
