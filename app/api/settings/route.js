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
    .select("paycheck_frequency")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ paycheck_frequency: data?.paycheck_frequency || "monthly" });
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const paycheckFrequency = body?.paycheck_frequency;

  if (!VALID_FREQUENCIES.includes(paycheckFrequency)) {
    return NextResponse.json({ error: "Invalid paycheck frequency." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, paycheck_frequency: paycheckFrequency, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}
