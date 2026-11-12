"use client";

import { useState } from "react";
import { useUser } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorText } from "@/lib/api";
import { useChangeStatus, useUpdateRequest } from "@/lib/mutations";
import type { RequestDetail, RequestStatus, RoleName } from "@/lib/types";
import { AssignModal } from "./assign-modal";
import { RequestForm } from "./request-form";

interface StatusAction {
  to: RequestStatus;
  label: string; // the button
  title: string; // the confirmation dialog
  explain: string;
  noteLabel?: string; // present = a note field is shown
  noteRequired?: boolean;
  danger?: boolean;
  done: string; // the toast
}

// Which status buttons each role sees for each status. This mirrors the API's state
// machine so we only offer moves that will succeed; the API remains the authority,
// and if the two ever disagree the user simply sees the API's error message.
function statusActions(role: RoleName, status: RequestStatus): StatusAction[] {
  if (role === "REQUESTER" && status === "PENDING") {
    return [
      {
        to: "CANCELLED",
        label: "Cancel request",
        title: "Cancel this request?",
        explain: "It will be closed and cannot be reopened. You can submit a new one at any time.",
        danger: true,
        done: "Request cancelled",
      },
    ];
  }
  if (role === "OFFICER" && status === "ASSIGNED") {
    return [
      {
        to: "IN_PROGRESS",
        label: "Start work",
        title: "Start work on this request?",
        explain: "The requester will see that it is in progress.",
        noteLabel: "Note (optional)",
        done: "Marked as in progress",
      },
    ];
  }
  if (role === "OFFICER" && status === "IN_PROGRESS") {
    return [
      {
        to: "COMPLETED",
        label: "Mark completed",
        title: "Mark this request as completed?",
        explain: "Add any photos of the repair first: images cannot be added afterwards.",
        noteLabel: "What was done? (optional)",
        done: "Marked as completed",
      },
    ];
  }
  if (role === "ADMIN" && status === "PENDING") {
    return [
      {
        to: "REJECTED",
        label: "Reject",
        title: "Reject this request?",
        explain: "The requester will see your reason. A rejected request is final.",
        noteLabel: "Reason",
        noteRequired: true,
        danger: true,
        done: "Request rejected",
      },
    ];
  }
  if (role === "ADMIN" && status === "COMPLETED") {
    return [
      {
        to: "IN_PROGRESS",
        label: "Reopen",
        title: "Reopen this request?",
        explain: "It goes back to the assigned officer as in progress.",
        noteLabel: "What still needs doing?",
        noteRequired: true,
        done: "Request reopened",
      },
    ];
  }
  return [];
}

export function RequestActions({ request }: { request: RequestDetail }) {
  const user = useUser();
  const toast = useToast();
  const changeStatus = useChangeStatus(request.id);
  const update = useUpdateRequest(request.id);

  const [confirming, setConfirming] = useState<StatusAction | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);

  const actions = statusActions(user.role, request.status);
  const canEdit = user.role === "REQUESTER" && request.status === "PENDING";
  const canAssign =
    user.role === "ADMIN" && (request.status === "PENDING" || request.status === "ASSIGNED");

  if (actions.length === 0 && !canEdit && !canAssign) return null;

  function closeConfirm() {
    changeStatus.reset();
    setConfirming(null);
  }

  return (
    <>
      {canAssign && (
        <Button onClick={() => setAssigning(true)}>
          {request.assignedOfficer ? "Reassign" : "Assign officer"}
        </Button>
      )}
      {actions
        .filter((action) => !action.danger)
        .map((action) => (
          <Button key={action.to} onClick={() => setConfirming(action)}>
            {action.label}
          </Button>
        ))}
      {canEdit && (
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
      )}
      {actions
        .filter((action) => action.danger)
        .map((action) => (
          <Button key={action.to} variant="danger" onClick={() => setConfirming(action)}>
            {action.label}
          </Button>
        ))}

      <Modal open={confirming !== null} onClose={closeConfirm} title={confirming?.title ?? ""}>
        {confirming && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              const note = String(new FormData(event.currentTarget).get("note") ?? "").trim();
              changeStatus.mutate(
                { status: confirming.to, note },
                {
                  onSuccess: () => {
                    toast.success(confirming.done);
                    closeConfirm();
                  },
                },
              );
            }}
          >
            <p className="text-muted">{confirming.explain}</p>
            <FormError message={changeStatus.isError ? errorText(changeStatus.error) : null} />
            {confirming.noteLabel && (
              <Textarea
                label={confirming.noteLabel}
                name="note"
                rows={3}
                maxLength={500}
                required={confirming.noteRequired}
              />
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeConfirm}>
                Go back
              </Button>
              <Button
                type="submit"
                variant={confirming.danger ? "danger" : "primary"}
                pending={changeStatus.isPending}
              >
                {confirming.label}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <AssignModal request={assigning ? request : null} onClose={() => setAssigning(false)} />

      <Modal
        open={editing}
        onClose={() => {
          update.reset();
          setEditing(false);
        }}
        title={`Edit ${request.reference}`}
      >
        <RequestForm
          initial={{
            title: request.title,
            description: request.description,
            location: request.location,
            categoryId: request.category.id,
            priority: request.priority,
          }}
          submitLabel="Save changes"
          pending={update.isPending}
          error={update.isError ? errorText(update.error) : null}
          onCancel={() => {
            update.reset();
            setEditing(false);
          }}
          onSubmit={(values) =>
            update.mutate(values, {
              onSuccess: () => {
                toast.success("Request updated");
                setEditing(false);
              },
            })
          }
        />
      </Modal>
    </>
  );
}
