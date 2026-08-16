import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Removes a single mistaken/duplicate contribution log entry and re-syncs
// the fund's running total (and completion status) to match. Before this,
// fund_contributions was effectively append-only from the app's point of
// view - a fat-fingered "Add contribution" amount had no way to be fixed
// short of a direct database edit.
export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: contribution, error: fetchError } = await supabase
    .from("fund_contributions")
    .select("id, fund_id, amount")
    .eq("id", params.contributionId)
    .eq("fund_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !contribution) {
    return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
  }

  const { data: fund, error: fundFetchError } = await supabase
    .from("sinking_funds")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fundFetchError || !fund) {
    return NextResponse.json({ error: "Fund not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("fund_contributions")
    .delete()
    .eq("id", params.contributionId)
    .eq("user_id", user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  // Re-sync the running total: subtract exactly what this entry added,
  // clamped at 0 so it can never go negative even if amount_saved was
  // already out of sync with the log for some other reason.
  const previousSaved = Number(fund.amount_saved || 0);
  const newSaved = Math.max(0, previousSaved - Number(contribution.amount));

  const updates = { amount_saved: newSaved };

  // If removing this contribution drops the fund back under its target,
  // an existing "completed" status no longer reflects reality - reopen
  // it. The reverse (re-completing on delete) can never happen, since
  // removing a contribution only ever lowers the total, never raises it.
  if (fund.completed_at && newSaved < Number(fund.target_amount)) {
    updates.completed_at = null;
  }

  const { data: updatedFund, error: updateError } = await supabase
    .from("sinking_funds")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ fund: updatedFund });
}
