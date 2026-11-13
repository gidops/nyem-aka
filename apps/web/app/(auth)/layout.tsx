import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const POINTS = [
  "Report a fault in under a minute, with a photo",
  "See who is working on it and what has been done",
  "Every step is recorded, from report to repair",
];

// Shared by the sign-in and create-account pages.
// Phones: logo above the form. Wide screens: a terracotta brand panel beside it,
// which is the other place the logo's light ("inverse") version is used.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden bg-accent text-surface lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="self-start rounded-lg">
          <Logo tone="inverse" size="lg" />
        </Link>
        <div className="flex flex-col gap-6">
          <p className="font-display text-4xl font-semibold tracking-tight text-balance">
            Something broken on campus? Lend it a hand.
          </p>
          <ul className="flex flex-col gap-3 text-lg">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden="true" className="mt-3 h-0.5 w-5 shrink-0 bg-surface" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm">
          <em>Nyem aka</em> is Igbo for &ldquo;lend me a hand&rdquo;.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <Link href="/" className="rounded-lg lg:hidden">
          <Logo size="lg" />
        </Link>
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
