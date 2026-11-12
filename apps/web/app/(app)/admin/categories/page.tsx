"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { FormError, Input, Textarea } from "@/components/ui/field";
import { Hero, PageBody } from "@/components/ui/hero";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, errorText } from "@/lib/api";
import { keys, useCategories } from "@/lib/queries";
import type { Category } from "@/lib/types";

// "new" = creating; a Category = editing that one; null = modal closed.
type Editing = Category | "new" | null;

export default function AdminCategoriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [editing, setEditing] = useState<Editing>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.categories });

  const save = useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Partial<Category> }) =>
      id === undefined
        ? api<Category>("/categories", { method: "POST", body })
        : api<Category>(`/categories/${id}`, { method: "PATCH", body }),
    onSuccess: (category) => {
      toast.success(`“${category.name}” saved`);
      setEditing(null);
      return refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: (category: Category) =>
      api<Category>(`/categories/${category.id}`, { method: "PATCH", body: { isActive: !category.isActive } }),
    onSuccess: (category) => {
      toast.success(`“${category.name}” ${category.isActive ? "reactivated" : "deactivated"}`);
      return refresh();
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const remove = useMutation({
    mutationFn: (category: Category) => api(`/categories/${category.id}`, { method: "DELETE" }),
    onSuccess: (_result, category) => {
      toast.success(`“${category.name}” deleted`);
      return refresh();
    },
    // The API refuses to delete a category that requests use, and says so.
    onError: (error) => toast.error(errorText(error)),
  });
  const busy = toggle.isPending || remove.isPending;

  const columns: Column<Category>[] = [
    { header: "Name", primary: true, cell: (category) => category.name },
    { header: "Description", cell: (category) => category.description ?? <span className="text-muted">—</span> },
    {
      header: "Status",
      cell: (category) => (
        <Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Hidden"}</Badge>
      ),
    },
    {
      header: "Actions",
      cell: (category) => (
        <span className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(category)}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => toggle.mutate(category)}>
            {category.isActive ? "Hide" : "Show"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete “${category.name}”? This only works if no request uses it.`)) {
                remove.mutate(category);
              }
            }}
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];

  function close() {
    save.reset();
    setEditing(null);
  }
  const current = editing !== null && editing !== "new" ? editing : undefined;

  return (
    <>
      <Hero
        title="Categories"
        description="The kinds of fault people can report. Hidden categories stay on old requests but cannot be chosen for new ones."
        actions={<Button onClick={() => setEditing("new")}>Add category</Button>}
      />
      <PageBody>
        {categories.isPending ? (
          <Loading />
        ) : categories.isError ? (
          <ErrorState message={errorText(categories.error)} onRetry={() => categories.refetch()} />
        ) : categories.data.length === 0 ? (
          <EmptyState title="No categories yet" action={<Button onClick={() => setEditing("new")}>Add category</Button>} />
        ) : (
          <DataTable caption="Request categories" columns={columns} rows={categories.data} rowKey={(category) => category.id} />
        )}
      </PageBody>

      <Modal open={editing !== null} onClose={close} title={current ? `Edit “${current.name}”` : "Add a category"}>
        {editing !== null && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const description = String(form.get("description") ?? "").trim();
              save.mutate({
                id: current?.id,
                body: { name: String(form.get("name")).trim(), ...(description && { description }) },
              });
            }}
          >
            <FormError message={save.isError ? errorText(save.error) : null} />
            <Input label="Name" name="name" defaultValue={current?.name} required minLength={2} maxLength={60} />
            <Textarea
              label="Description (optional)"
              name="description"
              defaultValue={current?.description ?? ""}
              rows={3}
              maxLength={200}
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" pending={save.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
