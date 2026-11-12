"use client";

import { Button } from "@/components/ui/button";

// A search field that applies on submit (Enter or the button), not on every
// keystroke, so typing "leaking tap" sends one request instead of eleven.
export function SearchBox({
  defaultValue,
  onSearch,
  placeholder = "Search title, location or reference",
}: {
  defaultValue: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(String(new FormData(event.currentTarget).get("q") ?? "").trim());
      }}
    >
      <input
        // Remounts the field when the URL value changes (e.g. the Back button).
        key={defaultValue}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label="Search requests"
        className="min-h-11 w-full min-w-0 rounded-full border border-line-strong bg-surface px-4 text-base placeholder:text-muted/70"
      />
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
