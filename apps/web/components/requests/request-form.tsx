"use client";

import { Button } from "@/components/ui/button";
import { FormError, Input, Select, Textarea } from "@/components/ui/field";
import { PRIORITY_LABELS } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { PRIORITIES, type Priority, type RequestInput } from "@/lib/types";

// The fields of a request, shared by "New request" and "Edit request".
// The length limits mirror the API's rules, so the browser catches most mistakes
// before anything is sent; the API still validates, and its message is shown in `error`.
export function RequestForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
  children,
}: {
  initial?: Partial<RequestInput>;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (values: RequestInput) => void;
  onCancel?: () => void;
  children?: React.ReactNode; // extra fields, e.g. the photo dropzone
}) {
  const categories = useCategories();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          title: String(form.get("title")).trim(),
          description: String(form.get("description")).trim(),
          location: String(form.get("location")).trim(),
          categoryId: Number(form.get("categoryId")),
          priority: String(form.get("priority")) as Priority,
        });
      }}
    >
      <FormError message={error ?? (categories.isError ? "Could not load categories. Reload the page." : null)} />

      <Input
        label="What is the problem?"
        hint="A short summary, e.g. “Leaking tap in Lab 2”."
        name="title"
        defaultValue={initial?.title}
        required
        minLength={5}
        maxLength={120}
      />
      <Textarea
        label="Describe it"
        hint="What is wrong, since when, and anything the officer should know."
        name="description"
        defaultValue={initial?.description}
        required
        minLength={10}
        maxLength={2000}
      />
      <Input
        label="Where is it?"
        hint="Building, floor and room."
        name="location"
        defaultValue={initial?.location}
        required
        minLength={2}
        maxLength={200}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Category"
          name="categoryId"
          // Remount once categories arrive so the saved choice is selected.
          key={categories.data ? "ready" : "loading"}
          defaultValue={initial?.categoryId ?? ""}
          required
          disabled={!categories.data}
        >
          <option value="" disabled>
            {categories.data ? "Choose a category" : "Loading…"}
          </option>
          {categories.data
            ?.filter((category) => category.isActive || category.id === initial?.categoryId)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </Select>
        <Select
          label="How urgent is it?"
          name="priority"
          defaultValue={initial?.priority ?? "MEDIUM"}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </div>

      {children}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" pending={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
