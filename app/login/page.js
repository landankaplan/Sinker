"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

// useSearchParams() requires a Suspense boundary in Next.js 14's App
// Router (`next build` fails without one - "missing-suspense-with-csr-
// bailout") - so the actual form lives in a child component, wrapped by
// the default export below.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Seeded from ?confirm_error=1 (see app/auth/callback/route.js) when an
  // email confirmation link was expired/invalid/already used - lets the
  // user know why they landed here instead of silently failing.
  const [error, setError] = useState(
    searchParams.get("confirm_error")
      ? "That confirmation link didn't work — it may have expired or already been used. Try logging in below, or sign up again."
      : null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-ink dark:text-cream-50">Log in</h1>
      <p className="mb-6 text-sm text-ink-muted dark:text-ink-300">Welcome back to StayAhead.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-cream-100 bg-white px-3 py-2 text-sm text-ink focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-ink-800 dark:bg-ink-900 dark:text-cream-50"
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-muted dark:text-ink-300">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-coral-600 underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
