"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/app-shell";
import { RequestForm } from "@/components/requests/request-form";
import { Card } from "@/components/ui/card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Hero, PageBody } from "@/components/ui/hero";
import { useToast } from "@/components/ui/toast";
import { errorText } from "@/lib/api";
import { useCreateRequest } from "@/lib/mutations";

function NewRequest() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateRequest();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <>
      <Hero
        title="Report a fault"
        description="Tell us what is wrong and where. A photo helps the officer come prepared."
      />
      <PageBody width="narrow">
        <Card>
          <RequestForm
            submitLabel="Submit request"
            pending={create.isPending}
            error={create.isError ? errorText(create.error) : null}
            onCancel={() => router.push("/requests")}
            onSubmit={(values) =>
              create.mutate(
                { values, files },
                {
                  onSuccess: ({ request, failedUploads }) => {
                    if (failedUploads > 0) {
                      toast.error(
                        `${request.reference} was submitted, but ${failedUploads} photo(s) did not upload. You can add them from the request page.`,
                      );
                    } else {
                      toast.success(`${request.reference} submitted`);
                    }
                    router.push(`/requests/${request.id}`);
                  },
                },
              )
            }
          >
            <FileDropzone files={files} onChange={setFiles} />
          </RequestForm>
        </Card>
      </PageBody>
    </>
  );
}

export default function NewRequestPage() {
  return (
    <RoleGate allow={["REQUESTER"]}>
      <NewRequest />
    </RoleGate>
  );
}
