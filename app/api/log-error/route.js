import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Self-hosted, minimal error logging - a free alternative to a third-party
// service like Sentry, so real-user crashes are visible without requiring
// another account signup. Called from app/error.js's client-side error
// boundary whenever a render error reaches it.
//
// Uses the admin (service-role) client to write, since a user who's
// crashed out of a broken render might not have a fully working session -
// this should never itself fail because of an auth edge case. Best-effort
// throughout: this route reports 200 even on internal failure, because a
// broken error logger must never become a second error the user sees.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const message = body?.message ? String(body.message).slice(0, 2000) : "Unknown client error";
  const stack = body?.stack ? String(body.stack).slice(0, 8000) : null;
  const url = body?.url ? String(body.url).slice(0, 500) : null;

  // Best-effort: attach the signed-in user if there is one, but a failure
  // to read the session shouldn't block logging the error itself.
  let userId = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // no session available - log anonymously
  }

  try {
    const admin = createAdminClient();
    await admin.from("error_log").insert({ user_id: userId, message, stack, url });
  } catch (err) {
    // Deliberately swallow: a logging failure should never surface as a
    // user-facing error on top of whatever they already hit.
    console.error("Failed to write to error_log:", err.message);
  }

  return NextResponse.json({ ok: true });
}
