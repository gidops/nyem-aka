export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4 py-10 text-neutral-900">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
