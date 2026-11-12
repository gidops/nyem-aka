"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { login } from "@/lib/auth";

// Only allow redirects to paths on this site, never to another website.
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      await login({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      // The browser stored the cookies from the response, so this navigation is signed in.
      router.replace(safeNextPath());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Sign in to Nyem Aka</h1>
      <FormError message={error} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
      <p className="text-sm text-neutral-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
