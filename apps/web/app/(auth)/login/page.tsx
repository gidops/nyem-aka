"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/field";
import { errorText } from "@/lib/api";
import { login } from "@/lib/auth";
import { keys } from "@/lib/queries";

// Only allow redirects to paths on this site, never to another website.
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const { user } = await login({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      // Start from an empty cache, then store the user we just received.
      queryClient.clear();
      queryClient.setQueryData(keys.me, user);
      router.replace(safeNextPath());
    } catch (cause) {
      setError(errorText(cause));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Sign in</h1>
      <FormError message={error} />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" pending={pending}>
        Sign in
      </Button>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-accent-strong underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
