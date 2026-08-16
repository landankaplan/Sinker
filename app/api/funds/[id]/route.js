import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase
    .from("sinking_funds")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Fund not found." }, { status: 404 });
  }

  const updates = {};

  if (body.name !== undefined) {
    const trimmedName = String(body.name).trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    }
    if (trimmedName.length > 200) {
      return NextResponse.json({ error: "Name must be 200 characters or fewer." }, { status: 400 });
    }
    updates.name = trimmedName;
  }

  if (body.target_amount !== undefined) {
    const amount = Number(body.target_amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Target amount must be a positive number." }, { status: 400 });
    }
    updates.target_amount = amount;
  }

  if (body.target_date !== undefined) {
    if (Number.isNaN(Date.parse(body.target_date))) {
      return NextResponse.json({ error: "A valid target date is required." }, { status: 400 });
    }
    updates.target_date = body.target_date;
  }

  if (body.amount_saved !== undefined) {
    const saved = Number(body.amount_saved);
    if (Number.isNaN(saved) || saved < 0) {
      return NextResponse.json({ error: "Amount saved can't be negative." }, { status: 400 });
    }
    updates.amount_saved = saved;
  }

  // Manual complete/reopen toggle: the client explicitly sends `completed_at`
  // (an ISO string to complete, or null to reopen). This always wins.
  const manualCompletionChange = Object.prototype.hasOwnProperty.call(body, "completed_at");
  if (manualCompletionChange) {
    updates.completed_at = body.completed_at;
  } else if (updates.amount_saved !== undefined || updates.target_amount !== undefined) {
    // Auto-complete on a FRESH crossing into "fully funded" - triggered by
    // either a contribution raising amount_saved to meet the target, OR by
    // target_amount itself being edited down to at/below what's already
    // saved (both are "now funded" the same way). Comparing "was it already
    // at/over target before this save" against "is it at/over target now"
    // (rather than just checking the current state) is what lets a
    // manually reopened fund (completed_at just set back to null, with
    // amount_saved still >= target_amount at that moment) survive later
    // unrelated edits without instantly re-completing - reopening leaves
    // wasAlreadyAtOrOverTarget true, so nothing here re-fires until the
    // fund is genuinely UNDER target and then crosses again.
    const previousTarget = Number(existing.target_amount);
    const previousSaved = Number(existing.amount_saved || 0);
    const effectiveTarget = updates.target_amount ?? previousTarget;
    const effectiveSaved = updates.amount_saved ?? previousSaved;

    const wasAlreadyAtOrOverTarget = previousSaved >= previousTarget;
    const isNowAtOrOverTarget = effectiveSaved >= effectiveTarget;

    if (!existing.completed_at && !wasAlreadyAtOrOverTarget && isNowAtOrOverTarget) {
      updates.completed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sinking_funds")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log a contribution event whenever this save raised amount_saved. This is
  // append-only history (separate from the running total on sinking_funds
  // itself) and is what powers the behind-pace insight. Only a positive
  // delta counts as a "contribution" - saves that lower amount_saved (a
  // correction) or leave it unchanged aren't logged. Best-effort: if this
  // insert fails, we still return the successful fund update rather than
  // failing the whole request over a secondary write.
  if (updates.amount_saved !== undefined) {
    const delta = Number(updates.amount_saved) - Number(existing.amount_saved || 0);
    if (delta > 0) {
      const { error: contributionError } = await supabase.from("fund_contributions").insert({
        fund_id: params.id,
        user_id: user.id,
        amount: delta,
      });
      if (contributionError) {
        console.error("Failed to log fund contribution:", contributionError.message);
      }
    }
  }

  return NextResponse.json({ fund: data });
}

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("sinking_funds")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
