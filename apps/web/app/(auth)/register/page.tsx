"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const department = String(form.get("department") ?? "").trim();
    setError(null);
    setPending(true);
    try {
      await register({
        fullName: String(form.get("fullName")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        ...(department && { department }),
      });
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-sm text-neutral-600">
        For students and staff. Maintenance officers are added by an administrator.
      </p>
      <FormError message={error} />
      <Field label="Full name" name="fullName" autoComplete="name" required minLength={2} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Department (optional)" name="department" />
      <Field
        label="Password (at least 8 characters)"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <SubmitButton pending={pending}>Create account</SubmitButton>
      <p className="text-sm text-neutral-600">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
