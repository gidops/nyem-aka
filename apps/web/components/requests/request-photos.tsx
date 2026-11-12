"use client";

import { useState } from "react";
import { useUser } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/field";
import { FileDropzone, MAX_IMAGES } from "@/components/ui/file-dropzone";
import { useToast } from "@/components/ui/toast";
import { errorText } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useRemoveAttachment, useUploadAttachments } from "@/lib/mutations";
import type { RequestDetail } from "@/lib/types";

const CLOSED = ["COMPLETED", "REJECTED", "CANCELLED"];

export function RequestPhotos({ request }: { request: RequestDetail }) {
  const user = useUser();
  const toast = useToast();
  const upload = useUploadAttachments(request.id);
  const remove = useRemoveAttachment();
  const [files, setFiles] = useState<File[]>([]);

  const mine = request.attachments.filter((attachment) => attachment.uploadedBy.id === user.id).length;
  const room = MAX_IMAGES - mine;
  // The same rules as the API: the owner or assigned officer, while the request is open.
  const canAdd = user.role !== "ADMIN" && !CLOSED.includes(request.status) && room > 0;

  return (
    <Card as="section">
      <CardTitle>Photos</CardTitle>

      {request.attachments.length === 0 ? (
        <p className="text-muted">No photos have been attached.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {request.attachments.map((attachment) => (
            <li key={attachment.id} className="overflow-hidden rounded-lg border border-line">
              <a href={attachment.url} target="_blank" rel="noreferrer" title="Open full size">
                {/* Images come from Cloudinary or the API, already sized for viewing. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={`Photo “${attachment.fileName}” added by ${attachment.uploadedBy.fullName}`}
                  loading="lazy"
                  className="aspect-video w-full bg-neutral-soft object-cover"
                />
              </a>
              <div className="flex flex-col gap-1 p-2 text-xs">
                <span className="text-muted">
                  {attachment.uploadedBy.fullName} · {formatDateTime(attachment.createdAt)}
                </span>
                {(user.role === "ADMIN" || attachment.uploadedBy.id === user.id) && (
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (!window.confirm("Remove this photo? This cannot be undone.")) return;
                      remove.mutate(attachment.id, {
                        onSuccess: () => toast.success("Photo removed"),
                        onError: (error) => toast.error(errorText(error)),
                      });
                    }}
                    className="self-start font-medium text-danger underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
          <FileDropzone
            files={files}
            onChange={setFiles}
            max={room}
            label={user.role === "OFFICER" ? "Add photos of the repair" : "Add more photos"}
          />
          <FormError message={upload.isError ? errorText(upload.error) : null} />
          {files.length > 0 && (
            <Button
              className="self-start"
              pending={upload.isPending}
              onClick={() =>
                upload.mutate(files, {
                  onSuccess: () => {
                    toast.success(files.length === 1 ? "Photo added" : `${files.length} photos added`);
                    setFiles([]);
                  },
                })
              }
            >
              Upload {files.length} {files.length === 1 ? "photo" : "photos"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
