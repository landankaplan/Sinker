import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import FundForm from "@/components/FundForm";
import FundList from "@/components/FundList";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import { calculatePerPaycheck, calculateBehindPace, toMonthlyAmount, formatCurrency } from "@/lib/calculations";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 30 days is the widest window calculateShortfallProjection ever looks at
  // (see lib/calculations.js) - fetching that much history up front here
  // means the per-fund math never needs another round-trip.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [{ data: funds }, { data: settings }, { data: recentContributions }] = await Promise.all([
    supabase
      .from("sinking_funds")
      .select("*")
      .order("target_date", { ascending: true }),
    supabase.from("user_settings").select("paycheck_frequency").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("fund_contributions")
      .select("fund_id, amount, contributed_at")
      .eq("user_id", user.id)
      .gte("contributed_at", thirtyDaysAgo.toISOString()),
  ]);

  const paycheckFrequency = settings?.paycheck_frequency || "monthly";
  const allFunds = funds || [];

  // Group the flat contribution list by fund so each FundCard only has to
  // look at its own history.
  const recentContributionsByFund = (recentContributions || []).reduce((byFund, contribution) => {
    if (!byFund[contribution.fund_id]) byFund[contribution.fund_id] = [];
    byFund[contribution.fund_id].push(contribution);
    return byFund;
  }, {});

  // weekly/biweekly pay doesn't divide evenly into months (52 or 26 paychecks
  // a year, not 48 or 24) - the summary below uses the true yearly average,
  // which is correct but easy to mistake for a bug if you sanity-check it by
  // hand assuming a flat 4 or 2 paychecks/month. Spell that out for those two.
  const SUMMARY_NOTE = {
    weekly:
      "Averaged across the year - weekly pay gives you 52 paychecks (not a flat 48), so some months you'll bank a bit more than this.",
    biweekly:
      "Averaged across the year - biweekly pay gives you 26 paychecks (not a flat 24), so some months you'll bank a bit more than this.",
    monthly: "Across all active funds, based on your monthly paycheck.",
  };

  const totalMonthly = allFunds
    .filter((f) => !f.completed_at)
    .reduce((sum, fund) => {
      const remaining = Math.max(0, Number(fund.target_amount) - Number(fund.amount_saved || 0));
      const { perPaycheck, isPastDue } = calculatePerPaycheck(remaining, fund.target_date, paycheckFrequency);
      // For a past-due fund, calculatePerPaycheck returns the full remaining
      // balance as "perPaycheck" (pay it now). Feeding that through
      // toMonthlyAmount would multiply it by paychecks-per-month as if it
      // recurred every paycheck, wildly overstating what's actually owed
      // (e.g. a $200 overdue balance would show as $433/mo needed on a
      // biweekly schedule). Add the one-time remaining balance directly instead.
      return sum + (isPastDue ? remaining : toMonthlyAmount(perPaycheck, paycheckFrequency));
    }, 0);

  const fundsBehindPace = allFunds.filter((f) => !f.completed_at).filter((fund) => {
    const behindPace = calculateBehindPace(
      Number(fund.target_amount),
      fund.created_at,
      fund.target_date,
      Number(fund.amount_saved || 0)
    );
    return behindPace.applicable && behindPace.isBehind;
  }).length;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {!settings && <OnboardingWelcome />}

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-ink">Your funds</h1>
          <span className="text-sm text-ink-muted">
            Paycheck frequency: <span className="font-medium capitalize">{paycheckFrequency}</span>
          </span>
        </div>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Average needed per month
          </p>
          <p className="mt-1 text-2xl font-bold text-coral-600">{formatCurrency(totalMonthly)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {SUMMARY_NOTE[paycheckFrequency] || SUMMARY_NOTE.monthly}
          </p>
          {fundsBehindPace > 0 && (
            <p className="mt-2 text-xs font-medium text-amber-600">
              {fundsBehindPace} fund{fundsBehindPace === 1 ? "" : "s"} behind pace
            </p>
          )}
        </div>

        <FundForm showExamples={allFunds.length === 0} />
        <FundList
          funds={allFunds}
          paycheckFrequency={paycheckFrequency}
          recentContributionsByFund={recentContributionsByFund}
        />
      </main>
    </>
  );
}
