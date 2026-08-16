import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, buildDigestEmail } from "@/lib/email";
import { calculateBehindPace } from "@/lib/calculations";
import { getDueSoonReminderType, shouldSendUnderfundedAlert, shouldSendInactivityNudge } from "@/lib/notifications";

// Never cache a cron response - every run must actually re-query current
// data, not serve a stale one from a previous invocation.
export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron (see vercel.json). Vercel automatically
// sends `Authorization: Bearer $CRON_SECRET` on cron-triggered requests
// when CRON_SECRET is set in the environment - this check rejects anyone
// else who finds the URL (this route is otherwise unauthenticated, since
// there's no logged-in user for a cron job to be "logged in" as).
export async function GET(request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();

  // Anyone with at least one active (not completed) fund is a candidate -
  // this naturally covers users who've never touched Settings at all,
  // since email_notifications_enabled defaults to true in the DB (see
  // supabase/schema.sql) and they just won't have a user_settings row yet.
  const { data: activeFundRows, error: fundsError } = await supabase
    .from("sinking_funds")
    .select("user_id")
    .is("completed_at", null);

  if (fundsError) {
    return NextResponse.json({ error: fundsError.message }, { status: 500 });
  }

  const candidateUserIds = [...new Set((activeFundRows || []).map((r) => r.user_id))];

  if (candidateUserIds.length === 0) {
    return NextResponse.json({ usersProcessed: 0, emailsSent: 0, reminderCount: 0, alertCount: 0, errors: [] });
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from("user_settings")
    .select("user_id, email_notifications_enabled")
    .in("user_id", candidateUserIds);

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const disabledUserIds = new Set(
    (settingsRows || []).filter((r) => r.email_notifications_enabled === false).map((r) => r.user_id)
  );
  const enabledUserIds = candidateUserIds.filter((id) => !disabledUserIds.has(id));

  let emailsSent = 0;
  let reminderCount = 0;
  let alertCount = 0;
  let inactivityCount = 0;
  const errors = [];

  for (const userId of enabledUserIds) {
    try {
      const [{ data: funds, error: userFundsError }, userResult] = await Promise.all([
        supabase.from("sinking_funds").select("*").eq("user_id", userId).is("completed_at", null),
        supabase.auth.admin.getUserById(userId),
      ]);

      if (userFundsError) {
        errors.push(`user ${userId}: ${userFundsError.message}`);
        continue;
      }

      const email = userResult?.data?.user?.email;
      if (!email || !funds || funds.length === 0) continue;

      // Full (not just recent) contribution history for this user's active
      // funds - shouldSendInactivityNudge needs the true last-activity
      // date, which could be well outside a 30-day window for a fund
      // that's genuinely gone quiet.
      const { data: allContributions, error: contributionsError } = await supabase
        .from("fund_contributions")
        .select("fund_id, contributed_at")
        .eq("user_id", userId);

      if (contributionsError) {
        errors.push(`user ${userId}: ${contributionsError.message}`);
      }
      const contributionsByFund = (allContributions || []).reduce((byFund, c) => {
        if (!byFund[c.fund_id]) byFund[c.fund_id] = [];
        byFund[c.fund_id].push(c);
        return byFund;
      }, {});

      const dueSoon = [];
      const underfunded = [];
      const inactive = [];

      for (const fund of funds) {
        const amountSaved = Number(fund.amount_saved || 0);
        const targetAmount = Number(fund.target_amount);
        const remaining = Math.max(0, targetAmount - amountSaved);

        // --- Due-soon reminder (fires once, at 7 days out and again at 1 day out) ---
        const reminderType = getDueSoonReminderType(remaining, fund.target_date, today);
        if (reminderType) {
          const { data: existing, error: existingError } = await supabase
            .from("notification_log")
            .select("id")
            .eq("fund_id", fund.id)
            .eq("notification_type", reminderType)
            .limit(1);

          if (existingError) {
            errors.push(`fund ${fund.id}: ${existingError.message}`);
          } else if (!existing || existing.length === 0) {
            dueSoon.push({ name: fund.name, remaining, type: reminderType, fundId: fund.id });
          }
        }

        // --- Underfunded alert (fires at most once every 7 days per fund) ---
        const behindPace = calculateBehindPace(targetAmount, fund.created_at, fund.target_date, amountSaved);
        if (behindPace.applicable && behindPace.isBehind) {
          const { data: lastAlert, error: lastAlertError } = await supabase
            .from("notification_log")
            .select("sent_at")
            .eq("fund_id", fund.id)
            .eq("notification_type", "underfunded")
            .order("sent_at", { ascending: false })
            .limit(1);

          if (lastAlertError) {
            errors.push(`fund ${fund.id}: ${lastAlertError.message}`);
          } else {
            const lastSentAt = lastAlert && lastAlert[0] ? lastAlert[0].sent_at : null;
            if (shouldSendUnderfundedAlert(behindPace, lastSentAt, today)) {
              underfunded.push({
                name: fund.name,
                behindBy: behindPace.behindBy,
                expectedByNow: behindPace.expectedByNow,
                fundId: fund.id,
              });
            }
          }
        }

        // --- Inactivity nudge (fires at most once every 14 days per fund) ---
        const { data: lastNudge, error: lastNudgeError } = await supabase
          .from("notification_log")
          .select("sent_at")
          .eq("fund_id", fund.id)
          .eq("notification_type", "inactivity")
          .order("sent_at", { ascending: false })
          .limit(1);

        if (lastNudgeError) {
          errors.push(`fund ${fund.id}: ${lastNudgeError.message}`);
        } else {
          const lastNudgeAt = lastNudge && lastNudge[0] ? lastNudge[0].sent_at : null;
          const fundContributions = contributionsByFund[fund.id] || [];
          if (shouldSendInactivityNudge(fund.created_at, fundContributions, lastNudgeAt, today)) {
            inactive.push({ name: fund.name, fundId: fund.id });
          }
        }
      }

      if (dueSoon.length === 0 && underfunded.length === 0 && inactive.length === 0) continue;

      const { subject, html } = buildDigestEmail({ dueSoon, underfunded, inactive });
      const result = await sendEmail({ to: email, subject, html });

      if (result.skipped) {
        errors.push(`user ${userId}: email skipped - ${result.reason}`);
        continue;
      }
      if (result.error) {
        errors.push(`user ${userId}: ${result.error}`);
        continue;
      }

      emailsSent += 1;
      reminderCount += dueSoon.length;
      alertCount += underfunded.length;
      inactivityCount += inactive.length;

      const logRows = [
        ...dueSoon.map((f) => ({ user_id: userId, fund_id: f.fundId, notification_type: f.type })),
        ...underfunded.map((f) => ({ user_id: userId, fund_id: f.fundId, notification_type: "underfunded" })),
        ...inactive.map((f) => ({ user_id: userId, fund_id: f.fundId, notification_type: "inactivity" })),
      ];
      const { error: logError } = await supabase.from("notification_log").insert(logRows);
      if (logError) errors.push(`user ${userId}: logged email but failed to record it - ${logError.message}`);
    } catch (err) {
      errors.push(`user ${userId}: ${err.message}`);
    }
  }

  return NextResponse.json({
    usersProcessed: enabledUserIds.length,
    emailsSent,
    reminderCount,
    alertCount,
    inactivityCount,
    errors,
  });
}
