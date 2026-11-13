import Link from "next/link";
import { HeroPreview } from "@/components/landing/hero-preview";
import { RoleTabs } from "@/components/role-tabs";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";

// In-page links. Each href matches the id of a section below.
const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#who-it-is-for", label: "Who it's for" },
];

const PROMISES = ["Works on any phone", "Every step recorded", "Free for the campus"];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "camera", title: "Photo evidence", text: "Attach photos so the fault is clear before anyone arrives" },
  { icon: "pulse", title: "Live status", text: "Pending, assigned, in progress, completed: always visible" },
  { icon: "assign", title: "Clear ownership", text: "Each request is assigned to one named officer" },
  { icon: "timeline", title: "Full timeline", text: "Every update, and who made it, in one place" },
  { icon: "shield", title: "Role-based access", text: "People see only what their role allows" },
  { icon: "chart", title: "Reports & export", text: "Search, filter and download any view as CSV" },
];

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

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const eyebrow = "text-sm font-semibold tracking-wide text-accent-strong uppercase";

// The public landing page. A server component: it has no interactivity of its own
// (apart from the role tabs), so it is rendered once to plain HTML and loads fast.
export default function LandingPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className={`${container} flex min-h-18 items-center gap-6`}>
          <Link href="/" className="rounded-lg">
            <Logo tagline />
          </Link>
          <nav aria-label="Sections" className="hidden flex-1 justify-center gap-1 md:flex">
            {NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-neutral-soft"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ButtonLink href="/login" variant="secondary" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" size="sm" className="max-sm:hidden">
              Report a fault
              <Icon name="arrow" size={16} />
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="border-b border-line bg-accent-soft">
          <div className={`${container} flex items-center justify-between gap-12 py-14 sm:py-20`}>
            <div className="flex max-w-2xl flex-col gap-6">
              <p className="inline-flex items-center gap-2 self-start rounded-full border border-accent/30 bg-surface px-3.5 py-1.5 text-sm font-medium">
                <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
                University maintenance &amp; service requests
              </p>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                Something broken on campus?{" "}
                <span className="text-accent-strong">Lend it a hand.</span>
              </h1>
              <p className="text-lg text-ink/80 sm:text-xl">
                Nyem Aka is where students and staff report maintenance faults, and where each one
                is assigned, fixed and accounted for.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/register">
                  Report a fault
                  <Icon name="arrow" size={18} />
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary">
                  Sign in
                </ButtonLink>
              </div>
              <ul className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
                {PROMISES.map((promise) => (
                  <li key={promise} className="flex items-center gap-2">
                    <Icon name="check" size={16} className="text-accent-strong" />
                    {promise}
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden shrink-0 lg:block">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-b border-line bg-surface">
          <ul className={`${container} grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-3 lg:grid-cols-6`}>
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex flex-col items-center gap-2 text-center">
                <span className="mb-1 flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <Icon name={feature.icon} size={24} />
                </span>
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="text-sm text-muted">{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="how-it-works" className="scroll-mt-20">
          <div className={`${container} grid gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_2fr] lg:gap-12`}>
            <div className="flex flex-col gap-3">
              <p className={eyebrow}>How it works</p>
              <h2 className="font-display text-3xl font-semibold text-balance">
                From broken to fixed in three steps
              </h2>
              <p className="text-muted">
                No phone calls, no paper forms, no wondering whether anyone saw it.
              </p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <Card as="li" key={step.title} className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent font-display text-lg font-semibold text-surface">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted">{step.text}</p>
                </Card>
              ))}
            </ol>
          </div>
        </section>

        <section id="who-it-is-for" className="scroll-mt-20 border-t border-line">
          <div className={`${container} flex flex-col gap-8 py-14 sm:py-20`}>
            <div className="flex flex-col gap-3">
              <p className={eyebrow}>Who it&rsquo;s for</p>
              <h2 className="font-display text-3xl font-semibold">Built for everyone involved</h2>
            </div>
            <RoleTabs />
          </div>
        </section>

        <section className={`${container} pb-14 sm:pb-20`}>
          <div className="flex flex-col gap-6 rounded-2xl bg-accent px-6 py-10 text-surface sm:px-10 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-3xl font-semibold text-balance">
                Seen something that needs fixing?
              </h2>
              <p className="text-lg">Create an account and report it in under a minute.</p>
            </div>
            <Link
              href="/register"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-surface px-6 font-medium text-accent-strong hover:bg-accent-soft"
            >
              Report a fault
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        </section>
      </main>

      {/* The dark band is where the logo's light ("inverse") version is used. */}
      <footer className="bg-ink text-surface">
        <div className={`${container} flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between`}>
          <div className="flex flex-col gap-3">
            <Logo tone="inverse" tagline />
            <p className="text-sm">
              <em>Nyem aka</em> is Igbo for &ldquo;lend me a hand&rdquo;.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {NAV.map((link) => (
              <a key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </a>
            ))}
            <Link href="/login" className="underline">
              Staff and officer sign-in
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
