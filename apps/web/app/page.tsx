import Link from "next/link";

// Placeholder home page. The real landing page with the hero band is built in Phase 4.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4 py-16 text-neutral-900">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight">Nyem Aka</h1>
        <p className="text-lg text-neutral-600">
          Report a maintenance fault on campus and follow it until it is fixed.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="rounded-full bg-neutral-900 px-6 py-3 text-center font-medium text-white">
            Sign in
          </Link>
          <Link href="/register" className="rounded-full border border-neutral-300 px-6 py-3 text-center font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
