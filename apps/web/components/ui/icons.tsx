// Small line icons, drawn for this project on a 24×24 grid in the same round-stroke
// style as the logo. They take the current text colour and are decorative: the label
// next to an icon carries the meaning, so each one is hidden from screen readers.

const PATHS = {
  camera: ["M4 8h3l1.5-2h7L17 8h3v11H4z", "M12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  pulse: ["M3 12h4l2.5-6 4 12 2.5-6h5"],
  assign: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M3 20c.6-3.3 3-5 6-5s5.4 1.7 6 5", "M16 8h5", "M18.5 5.5 21 8l-2.5 2.5"],
  timeline: ["M6 4v16", "M6 6h.01", "M6 12h.01", "M6 18h.01", "M11 6h9", "M11 12h9", "M11 18h6"],
  shield: ["M12 3 5 6v5c0 4.5 2.9 8.3 7 10 4.1-1.7 7-5.5 7-10V6z", "m9 12 2 2 4-4"],
  chart: ["M4 20h16", "M7 20v-6", "M12 20V5", "M17 20v-9"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
