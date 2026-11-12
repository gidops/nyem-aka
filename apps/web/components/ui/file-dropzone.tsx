"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatBytes } from "@/lib/format";
import { cn } from "./cn";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// Choose images by tapping (opens the camera or gallery on a phone) or by dragging
// files in. The checks here only save the user a wasted upload: the API repeats
// them, because anything running in the browser can be bypassed.
export function FileDropzone({
  files,
  onChange,
  max = MAX_IMAGES,
  label = "Photos of the fault",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  label?: string;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Temporary local addresses so the chosen images can be shown before upload.
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  // Release them when the list changes, or the browser keeps the images in memory.
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  function add(list: FileList | null) {
    if (!list) return;
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (!ACCEPTED.includes(file.type)) problems.push(`${file.name}: only JPEG, PNG or WebP`);
      else if (file.size > MAX_IMAGE_BYTES) problems.push(`${file.name}: larger than 5 MB`);
      else accepted.push(file);
    }
    const room = max - files.length;
    if (accepted.length > room) problems.push(`Only ${max} images can be attached`);
    setProblem(problems.length > 0 ? problems.join(". ") : null);
    if (room > 0) onChange([...files, ...accepted.slice(0, room)]);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-ink/50",
        )}
      >
        <span className="font-medium">
          <span className="text-accent-strong underline">Choose images</span> or drag them here
        </span>
        <span className="text-sm text-muted">
          JPEG, PNG or WebP · up to 5 MB each · {files.length} of {max} added
        </span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            add(event.target.files);
            event.target.value = ""; // so the same file can be chosen again after removal
          }}
        />
      </label>

      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}

      {previews.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map(({ file, url }, index) => (
            <li key={url} className="overflow-hidden rounded-lg border border-line bg-surface">
              {/* A local preview: next/image cannot optimise a blob: address. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Preview of ${file.name}`} className="aspect-video w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className="min-w-0 truncate" title={file.name}>
                  {file.name} · {formatBytes(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, position) => position !== index))}
                  className="shrink-0 font-medium text-danger underline"
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
