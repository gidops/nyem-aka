import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

// Pill-shaped, flat, and at least 44px tall at the default size (a comfortable tap target).
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-ink bg-transparent text-ink hover:bg-neutral-soft",
  ghost: "text-ink hover:bg-neutral-soft",
  danger: "border border-danger text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-base",
  sm: "min-h-9 px-3.5 text-sm",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

const styles = ({ variant = "primary", size = "md", className }: StyleProps) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = StyleProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { pending?: boolean };

export function Button({ variant, size, className, pending, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || pending}
      className={styles({ variant, size, className })}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

// The same look for navigation. A link goes somewhere; a button does something.
export function ButtonLink({
  variant,
  size,
  className,
  href,
  children,
}: StyleProps & { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles({ variant, size, className })}>
      {children}
    </Link>
  );
}
