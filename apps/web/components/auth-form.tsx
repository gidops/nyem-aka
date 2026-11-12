// Small shared pieces for the login and register pages.
// Deliberately plain: the real design system arrives in Phase 4.

export function Field({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        {...input}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-base font-normal text-neutral-900 outline-none focus:border-neutral-900"
      />
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-neutral-900 px-5 py-3 text-base font-medium text-white disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
