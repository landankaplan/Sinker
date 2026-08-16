import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lists this fund's contribution history, most recent first - powers the
// "History" panel in components/ContributionHistory.js so a mistaken or
// duplicate entry can be spotted and removed (see the DELETE handler in
// app/api/funds/[id]/contributions/[contributionId]/route.js).
export async function GET(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Confirm the fund belongs to this user before returning anything. RLS
  // already enforces this at the DB layer (fund_contributions' select
  // policy is scoped to auth.uid() = user_id), but a clean 404 here reads
  // better than a silently-empty list if a bad/foreign id is ever passed.
  const { data: fund } = await supabase
    .from("sinking_funds")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!fund) return NextResponse.json({ error: "Fund not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("fund_contributions")
    .select("id, amount, contributed_at")
    .eq("fund_id", params.id)
    .eq("user_id", user.id)
    .order("contributed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contributions: data });
}
