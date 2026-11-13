import { cn } from "./cn";

// The wide band across the top of a page. Full-width colour, with the content held
// to the same max width as the rest of the page so edges line up.
// size="lg" is the landing page; "md" is the header of an app page.
export function Hero({
  eyebrow,
  title,
  description,
  actions,
  art,
  size = "md",
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  art?: React.ReactNode; // decoration beside the text; shown on wide screens only
  size?: "md" | "lg";
}) {
  return (
    <section className="border-b border-line bg-accent-soft">
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-6",
          size === "lg" ? "py-14 sm:py-24" : "py-8 sm:py-10",
        )}
      >
        {eyebrow && (
          <p className="text-sm font-semibold tracking-wide text-accent-strong uppercase">{eyebrow}</p>
        )}
        <div
          className={cn(
            "flex flex-col gap-4",
            // App pages put their actions beside the title; the landing page stacks
            // them under the text and gives the right-hand side to the artwork.
            size === "lg" ? "lg:flex-row lg:items-center lg:justify-between lg:gap-12" : "sm:flex-row sm:items-end sm:justify-between",
          )}
        >
          <div className={cn("flex max-w-3xl flex-col gap-3", size === "lg" && "gap-5")}>
            <h1
              className={cn(
                "font-display font-semibold tracking-tight text-balance",
                size === "lg" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl",
              )}
            >
              {title}
            </h1>
            {description && (
              <p className={cn("text-ink/80", size === "lg" ? "text-lg sm:text-xl" : "text-base")}>
                {description}
              </p>
            )}
            {size === "lg" && actions && (
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">{actions}</div>
            )}
          </div>
          {size === "md" && actions && (
            <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">{actions}</div>
          )}
          {art && <div className="hidden shrink-0 lg:block">{art}</div>}
        </div>
      </div>
    </section>
  );
}

// The matching content container for whatever follows a Hero.
// "narrow" suits a single form or message, where full-width lines would be hard to read.
export function PageBody({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10",
        width === "wide" ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      {children}
    </div>
  );
}
