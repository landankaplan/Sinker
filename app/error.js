"use client";

import { useEffect } from "react";

// Next.js's App Router error boundary: catches any render/data error
// thrown by a page or component below the root layout and shows this
// instead of a blank/broken screen. Reports the error to our own
// self-hosted log (see app/api/log-error) so real-user crashes are
// actually visible - best-effort and silent on failure, since a broken
// error reporter must never itself throw a second error in front of the
// user.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message,
        stack: error?.stack,
        url: typeof window !== "undefined" ? window.location.href : null,
      }),
    }).catch(() => {
      // Nothing more to do - see the note above.
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-4 text-center">
      <p className="text-4xl">😬</p>
      <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        That wasn't supposed to happen. Your funds and account are safe — this was just a hiccup loading the
        page. Try again, and it's already been logged so it can get fixed.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-cream-100 px-4 py-2 text-sm text-ink hover:bg-cream-100"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
