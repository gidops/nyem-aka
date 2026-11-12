import { Card } from "./card";

// What a list or page shows while loading, when empty, and when something failed.
// Every data view needs all three; having them as components keeps them consistent.

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {action}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-3 border-danger/40">
      <p role="alert" className="text-danger">
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium text-accent-strong underline">
          Try again
        </button>
      )}
    </Card>
  );
}
