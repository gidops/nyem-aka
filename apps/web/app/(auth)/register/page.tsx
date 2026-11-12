"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/field";
import { errorText } from "@/lib/api";
import { register } from "@/lib/auth";
import { keys } from "@/lib/queries";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const department = String(form.get("department") ?? "").trim();
    setError(null);
    setPending(true);
    try {
      const { user } = await register({
        fullName: String(form.get("fullName")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        ...(department && { department }),
      });
      queryClient.clear();
      queryClient.setQueryData(keys.me, user);
      router.replace("/dashboard");
    } catch (cause) {
      setError(errorText(cause));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted">
          For students and staff. Maintenance officers are added by an administrator.
        </p>
      </div>
      <FormError message={error} />
      <Input label="Full name" name="fullName" autoComplete="name" required minLength={2} maxLength={100} />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Department (optional)" name="department" maxLength={100} />
      <Input
        label="Password"
        hint="At least 8 characters."
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
      />
      <Button type="submit" pending={pending}>
        Create account
      </Button>
      <p className="text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent-strong underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
