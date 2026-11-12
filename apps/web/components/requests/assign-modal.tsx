"use client";

import { Button } from "@/components/ui/button";
import { FormError, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorText } from "@/lib/api";
import { useAssignRequest } from "@/lib/mutations";
import { useUsers } from "@/lib/queries";

// Admin: choose a maintenance officer for a request (or a different one).
export function AssignModal({
  request,
  onClose,
}: {
  // null means the modal is closed.
  request: { id: string; reference: string; assignedOfficer: { id: string } | null } | null;
  onClose: () => void;
}) {
  const open = request !== null;
  // Only fetch the officer list once the modal is actually opened.
  const officers = useUsers({ role: "OFFICER", isActive: "true", limit: 100 }, open);
  const assign = useAssignRequest();
  const toast = useToast();
  const currentId = request?.assignedOfficer?.id;
  const choices = officers.data?.data.filter((officer) => officer.id !== currentId) ?? [];

  function close() {
    assign.reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`${currentId ? "Reassign" : "Assign"} ${request?.reference ?? ""}`}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!request) return;
          const form = new FormData(event.currentTarget);
          assign.mutate(
            {
              id: request.id,
              officerId: String(form.get("officerId")),
              note: String(form.get("note") ?? "").trim(),
            },
            {
              onSuccess: () => {
                toast.success(`${request.reference} assigned`);
                close();
              },
            },
          );
        }}
      >
        <FormError
          message={
            assign.isError
              ? errorText(assign.error)
              : officers.isError
                ? "Could not load the list of officers."
                : officers.data && choices.length === 0
                  ? "There is no other active maintenance officer. Add one under Users first."
                  : null
          }
        />
        <Select label="Maintenance officer" name="officerId" defaultValue="" required disabled={choices.length === 0}>
          <option value="" disabled>
            {officers.isPending ? "Loading…" : "Choose an officer"}
          </option>
          {choices.map((officer) => (
            <option key={officer.id} value={officer.id}>
              {officer.fullName}
              {officer.department ? ` · ${officer.department}` : ""}
            </option>
          ))}
        </Select>
        <Textarea
          label="Note for the officer (optional)"
          name="note"
          rows={3}
          maxLength={500}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" pending={assign.isPending} disabled={choices.length === 0}>
            {currentId ? "Reassign" : "Assign"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
