import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after a user clicks the email confirmation link.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // A failed exchange (expired/already-used/invalid link) previously
    // still redirected to "/" as if it worked - the user would just get
    // silently bounced to /login with no session and no explanation. Now
    // it lands on /login with a message instead.
    if (error) {
      return NextResponse.redirect(`${origin}/login?confirm_error=1`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
