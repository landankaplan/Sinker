"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client (safe to use in client components).
// Uses the publishable key only - never put the secret key here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
