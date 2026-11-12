"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useUser } from "@/components/app-shell";
import { SearchBox } from "@/components/requests/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { FormError, Input, Select } from "@/components/ui/field";
import { Hero, PageBody } from "@/components/ui/hero";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, errorText } from "@/lib/api";
import { formatDate, ROLE_LABELS } from "@/lib/format";
import { keys, useUsers } from "@/lib/queries";
import type { RoleName, User } from "@/lib/types";
import { useUrlState } from "@/lib/use-url-state";

const ROLES = Object.keys(ROLE_LABELS) as RoleName[];

export default function AdminUsersPage() {
  const me = useUser();
  const url = useUrlState();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [changingRole, setChangingRole] = useState<User | null>(null);

  const q = url.get("q");
  const role = url.get("role");
  const users = useUsers({ q, role, page: url.page, limit: 15 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.users });

  const create = useMutation({
    mutationFn: (body: Record<string, string>) => api<User>("/users", { method: "POST", body }),
    onSuccess: (user) => {
      toast.success(`${user.fullName} added`);
      setCreating(false);
      return refresh();
    },
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role: next }: { id: string; role: RoleName }) =>
      api<User>(`/users/${id}/role`, { method: "PATCH", body: { role: next } }),
    onSuccess: (user) => {
      toast.success(`${user.fullName} is now: ${ROLE_LABELS[user.role]}`);
      setChangingRole(null);
      return refresh();
    },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api<User>(`/users/${id}/status`, { method: "PATCH", body: { isActive } }),
    onSuccess: (user) => {
      toast.success(`${user.fullName} ${user.isActive ? "reactivated" : "deactivated"}`);
      return refresh();
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const columns: Column<User>[] = [
    {
      header: "Name",
      primary: true,
      cell: (user) => (
        <>
          {user.fullName}
          {user.id === me.id && <span className="font-normal text-muted"> (you)</span>}
          <span className="inline-block w-full text-xs font-normal break-all text-muted">{user.email}</span>
        </>
      ),
    },
    { header: "Role", cell: (user) => ROLE_LABELS[user.role] },
    { header: "Department", cell: (user) => user.department ?? <span className="text-muted">—</span> },
    {
      header: "Status",
      cell: (user) => <Badge tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Active" : "Deactivated"}</Badge>,
    },
    { header: "Joined", cell: (user) => formatDate(user.createdAt), className: "whitespace-nowrap" },
    {
      header: "Actions",
      // You cannot change your own role or deactivate yourself (the API refuses too),
      // so the buttons are not offered on your own row.
      cell: (user) =>
        user.id === me.id ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setChangingRole(user)}>
              Change role
            </Button>
            <Button
              variant={user.isActive ? "danger" : "secondary"}
              size="sm"
              disabled={setStatus.isPending}
              onClick={() => {
                if (
                  user.isActive &&
                  !window.confirm(`Deactivate ${user.fullName}? They will be signed out and unable to sign in.`)
                ) {
                  return;
                }
                setStatus.mutate({ id: user.id, isActive: !user.isActive });
              }}
            >
              {user.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </span>
        ),
    },
  ];

  return (
    <>
      <Hero
        title="Users"
        description="Add maintenance officers and administrators, and manage access."
        actions={<Button onClick={() => setCreating(true)}>Add user</Button>}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <SearchBox defaultValue={q} onSearch={(value) => url.set({ q: value })} placeholder="Search name or email" />
          <Select label="Role" value={role} onChange={(event) => url.set({ role: event.target.value })}>
            <option value="">All roles</option>
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </Select>
        </div>

        {users.isPending ? (
          <Loading />
        ) : users.isError ? (
          <ErrorState message={errorText(users.error)} onRetry={() => users.refetch()} />
        ) : users.data.data.length === 0 ? (
          <EmptyState title="No users match" description="Try a different search or role." />
        ) : (
          <>
            <DataTable caption="Users" columns={columns} rows={users.data.data} rowKey={(user) => user.id} stale={users.isPlaceholderData} />
            <Pagination {...users.data.meta} onChange={(page) => url.set({ page })} />
          </>
        )}
      </PageBody>

      <Modal
        open={creating}
        onClose={() => {
          create.reset();
          setCreating(false);
        }}
        title="Add a user"
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const department = String(form.get("department") ?? "").trim();
            create.mutate({
              fullName: String(form.get("fullName")),
              email: String(form.get("email")),
              password: String(form.get("password")),
              role: String(form.get("role")),
              ...(department && { department }),
            });
          }}
        >
          <FormError message={create.isError ? errorText(create.error) : null} />
          <Input label="Full name" name="fullName" required minLength={2} maxLength={100} />
          <Input label="Email" name="email" type="email" required />
          <Input label="Department (optional)" name="department" maxLength={100} />
          <Select label="Role" name="role" defaultValue="OFFICER">
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </Select>
          <Input
            label="Temporary password"
            hint="At least 8 characters. Give it to the user privately."
            name="password"
            type="text"
            autoComplete="off"
            required
            minLength={8}
            maxLength={128}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                create.reset();
                setCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" pending={create.isPending}>
              Add user
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={changingRole !== null}
        onClose={() => {
          changeRole.reset();
          setChangingRole(null);
        }}
        title={`Change role: ${changingRole?.fullName ?? ""}`}
      >
        {changingRole && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              changeRole.mutate({
                id: changingRole.id,
                role: String(new FormData(event.currentTarget).get("role")) as RoleName,
              });
            }}
          >
            <p className="text-muted">
              They will be signed out and must sign in again. The new role applies fully within 15 minutes.
            </p>
            <FormError message={changeRole.isError ? errorText(changeRole.error) : null} />
            <Select label="New role" name="role" defaultValue={changingRole.role}>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABELS[item]}
                </option>
              ))}
            </Select>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  changeRole.reset();
                  setChangingRole(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" pending={changeRole.isPending}>
                Save role
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
