import { useId } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 text-base text-ink " +
  "placeholder:text-muted/70 hover:border-ink/50 disabled:bg-neutral-soft disabled:text-muted";

interface FieldShell {
  label: string;
  hint?: string;
  className?: string;
}

// Label + control + optional hint, wired together for screen readers.
function Shell({
  label,
  hint,
  className,
  children,
}: FieldShell & { children: (ids: { id: string; hintId?: string }) => React.ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, hintId })}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Input({
  label,
  hint,
  className,
  ...props
}: FieldShell & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">) {
  return (
    <Shell label={label} hint={hint} className={className}>
      {({ id, hintId }) => (
        <input {...props} id={id} aria-describedby={hintId} className={cn(control, "min-h-11")} />
      )}
    </Shell>
  );
}

export function Textarea({
  label,
  hint,
  className,
  ...props
}: FieldShell & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  return (
    <Shell label={label} hint={hint} className={className}>
      {({ id, hintId }) => (
        <textarea
          rows={4}
          {...props}
          id={id}
          aria-describedby={hintId}
          className={cn(control, "py-2.5")}
        />
      )}
    </Shell>
  );
}

export function Select({
  label,
  hint,
  className,
  children,
  ...props
}: FieldShell & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  return (
    <Shell label={label} hint={hint} className={className}>
      {({ id, hintId }) => (
        <select {...props} id={id} aria-describedby={hintId} className={cn(control, "min-h-11")}>
          {children}
        </select>
      )}
    </Shell>
  );
}

// An error message that screen readers announce as soon as it appears.
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}
