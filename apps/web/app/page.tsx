import Link from "next/link";
import { RoleTabs } from "@/components/role-tabs";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hero } from "@/components/ui/hero";
import { Logo, LogoMark } from "@/components/ui/logo";

const STEPS = [
  {
    title: "Report",
    text: "Say what is broken and where. Add a photo so the officer arrives knowing what to bring.",
  },
  {
    title: "Assign",
    text: "An administrator reviews the request and assigns it to the right maintenance officer.",
  },
  {
    title: "Resolve",
    text: "The officer updates progress and marks it complete. You can follow every step.",
  },
];

// The public landing page. A server component: it has no interactivity of its own,
// so it is rendered once to plain HTML and loads fast.
export default function LandingPage() {
  return (
    <>
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <ButtonLink href="/login" variant="secondary" size="sm">
            Sign in
          </ButtonLink>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Hero
          size="lg"
          eyebrow="University maintenance & service requests"
          title="Something broken on campus? Lend it a hand."
          description="Nyem Aka is where students and staff report maintenance faults, and where each one is assigned, fixed and accounted for."
          art={<LogoMark size={220} />}
          actions={
            <>
              <ButtonLink href="/register">Report a fault</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Sign in
              </ButtonLink>
            </>
          }
        />

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="font-display text-3xl font-semibold">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card as="li" key={step.title} className="flex flex-col gap-3">
                <span className="font-display text-3xl font-semibold text-accent">{index + 1}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-muted">{step.text}</p>
              </Card>
            ))}
          </ol>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="font-display text-3xl font-semibold">Built for everyone involved</h2>
            <RoleTabs />
          </div>
        </section>
      </main>

      {/* The dark band is where the logo's light ("inverse") version is used. */}
      <footer className="bg-ink text-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-3">
            <Logo tone="inverse" />
            <p className="text-sm">
              <em>Nyem aka</em> is Igbo for &ldquo;lend me a hand&rdquo;.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm sm:items-end">
            <p>University Maintenance &amp; Service Request System</p>
            <Link href="/login" className="underline">
              Staff and officer sign-in
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
