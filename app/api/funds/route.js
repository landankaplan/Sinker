import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("sinking_funds")
    .select("*")
    .order("target_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ funds: data });
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { name, target_amount, target_date } = body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (name.trim().length > 200) {
    return NextResponse.json({ error: "Name must be 200 characters or fewer." }, { status: 400 });
  }
  if (!target_amount || Number.isNaN(Number(target_amount)) || Number(target_amount) <= 0) {
    return NextResponse.json({ error: "Target amount must be a positive number." }, { status: 400 });
  }
  if (!target_date || Number.isNaN(Date.parse(target_date))) {
    return NextResponse.json({ error: "A valid target date is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sinking_funds")
    .insert({
      user_id: user.id,
      name: name.trim(),
      target_amount: Number(target_amount),
      target_date,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ fund: data }, { status: 201 });
}
