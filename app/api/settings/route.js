import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly"];

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_settings")
    .select("paycheck_frequency, email_notifications_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    paycheck_frequency: data?.paycheck_frequency || "monthly",
    // Matches the DB column default (see supabase/schema.sql) so a user who
    // has never saved settings still sees the toggle "on" here, not "off".
    email_notifications_enabled: data?.email_notifications_enabled ?? true,
  });
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const paycheckFrequency = body?.paycheck_frequency;
  // Optional on purpose: FundForm's onboarding flow only ever sends
  // paycheck_frequency, and shouldn't be forced to also decide the
  // notifications setting. Omitting the field entirely leaves whatever
  // value is already in the DB (or the column default) untouched.
  const emailNotificationsEnabled = body?.email_notifications_enabled;

  if (!VALID_FREQUENCIES.includes(paycheckFrequency)) {
    return NextResponse.json({ error: "Invalid paycheck frequency." }, { status: 400 });
  }
  if (emailNotificationsEnabled !== undefined && typeof emailNotificationsEnabled !== "boolean") {
    return NextResponse.json({ error: "email_notifications_enabled must be true or false." }, { status: 400 });
  }

  const upsertBody = {
    user_id: user.id,
    paycheck_frequency: paycheckFrequency,
    updated_at: new Date().toISOString(),
  };
  if (emailNotificationsEnabled !== undefined) {
    upsertBody.email_notifications_enabled = emailNotificationsEnabled;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(upsertBody, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}
