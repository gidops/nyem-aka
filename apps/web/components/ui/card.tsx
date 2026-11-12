import { cn } from "./cn";

// Flat surface with a 1px border and no shadow.
export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag className={cn("rounded-xl border border-line bg-surface p-5 sm:p-6", className)}>
      {children}
    </Tag>
  );
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}
