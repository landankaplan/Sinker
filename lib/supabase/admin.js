import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only, cross-user operations. This key
// bypasses Row Level Security entirely, which is exactly why it's needed
// here: the notifications cron job has to read every user's funds and
// settings in one run, not just "whoever is currently logged in" (there is
// no logged-in user when Vercel Cron calls this - it's not a browser
// request).
//
// NEVER import this file from a client component, from lib/supabase/client.js,
// or from any code path reachable by a browser - it must only be used from
// app/api/cron/notifications/route.js (or other future server-only, trusted
// routes explicitly protected the same way).
export function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
