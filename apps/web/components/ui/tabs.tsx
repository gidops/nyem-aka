"use client";

import { cn } from "./cn";

export interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

// A row of tabs that switches what a list shows. On a narrow screen the row scrolls
// sideways instead of wrapping or shrinking the text.
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-medium whitespace-nowrap",
              selected
                ? "border-accent text-accent-strong"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selected ? "bg-accent-soft" : "bg-neutral-soft",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
