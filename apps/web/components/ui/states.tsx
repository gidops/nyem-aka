import { Card } from "./card";
import { LogoMark } from "./logo";

// What a list or page shows while loading, when empty, and when something failed.
// Every data view needs all three; having them as components keeps them consistent.

// The logo doubles as the loading indicator: its spanner rocks while we wait.
// "inline" sits above a list; "page" is centred, for when a whole screen is loading
// (which can take a while when the free-tier API is waking up).
export function Loading({
  label = "Loading…",
  size = "inline",
}: {
  label?: string;
  size?: "inline" | "page";
}) {
  return (
    <div
      role="status"
      className={
        size === "page"
          ? "flex flex-col items-center gap-4 py-10 text-muted"
          : "flex items-center gap-3 py-10 text-muted"
      }
    >
      <LogoMark animated size={size === "page" ? 56 : 28} />
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
