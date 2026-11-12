import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="font-display text-2xl font-semibold">
        Nyem Aka
      </Link>
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
