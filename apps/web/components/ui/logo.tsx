import { cn } from "./cn";

// The Nyem Aka logo: an open hand holding up a spanner (a helping hand + maintenance).
//
// One component draws every version, so the logo cannot drift between pages:
//   tone      "brand"   terracotta badge, for the light canvas (the default)
//             "inverse" white badge, for dark or terracotta backgrounds
//   wordmark  "always"  symbol + name        "from-sm" symbol only on phones
//             "never"   symbol only (the name stays available to screen readers)
//   size      "sm" | "md" | "lg"
//   tagline   adds "Maintenance & service requests" under the name (wide screens only)
//
// Colours come from the design tokens. The only copies with fixed hex values are
// app/icon.svg and app/apple-icon.png (the browser-tab icons), which cannot read CSS.

type Tone = "brand" | "inverse";

// Drawn on a 32×32 grid with round strokes so it stays legible down to 16px.
const SPANNER = ["M26.5 8A4.2 4.2 0 1 1 22.3 3.8", "M19.3 11 14.3 16"];
const HAND = [
  "M3.5 23.5l3.5-2.6c.5-.4 1.1-.6 1.8-.6h5.4a1.9 1.9 0 0 1 0 3.8H11",
  "M3.5 28.5h10.3c1.5 0 2.9-.6 4-1.6l7.2-6.4a1.9 1.9 0 0 0-2.6-2.8l-5.2 4.3",
];

export function LogoMark({
  size = 32,
  tone = "brand",
  animated = false,
  className,
}: {
  size?: number;
  tone?: Tone;
  animated?: boolean; // the spanner rocks, as if tightening a bolt (see globals.css)
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className={tone === "brand" ? "fill-accent" : "fill-surface"} />
      <g
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={tone === "brand" ? "stroke-surface" : "stroke-accent"}
      >
        <g className={animated ? "logo-spanner" : undefined}>
          {SPANNER.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {HAND.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

const SIZES = {
  sm: { mark: 28, text: "text-lg" },
  md: { mark: 32, text: "text-xl" },
  lg: { mark: 44, text: "text-3xl" },
};

export function Logo({
  tone = "brand",
  size = "md",
  wordmark = "always",
  tagline = false,
  className,
}: {
  tone?: Tone;
  tagline?: boolean;
  size?: keyof typeof SIZES;
  wordmark?: "always" | "from-sm" | "never";
  className?: string;
}) {
  const { mark, text } = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={mark} tone={tone} />
      <span
        className={cn(
          "flex flex-col leading-none",
          tone === "brand" ? "text-ink" : "text-surface",
          // sr-only hides the name visually but keeps it as the link's accessible name.
          wordmark === "never" && "sr-only",
          wordmark === "from-sm" && "sr-only sm:not-sr-only",
        )}
      >
        <span className={cn("font-display font-semibold tracking-tight whitespace-nowrap", text)}>
          Nyem <span className={tone === "brand" ? "text-accent-strong" : undefined}>Aka</span>
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-1 hidden text-xs font-medium whitespace-nowrap sm:block",
              tone === "brand" && "text-muted",
            )}
          >
            Maintenance &amp; service requests
          </span>
        )}
      </span>
    </span>
  );
}
