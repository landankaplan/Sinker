import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import FundForm from "@/components/FundForm";
import FundList from "@/components/FundList";
import { calculatePerPaycheck, toMonthlyAmount, formatCurrency } from "@/lib/calculations";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: funds }, { data: settings }] = await Promise.all([
    supabase
      .from("sinking_funds")
      .select("*")
      .order("target_date", { ascending: true }),
    supabase.from("user_settings").select("paycheck_frequency").eq("user_id", user.id).maybeSingle(),
  ]);

  const paycheckFrequency = settings?.paycheck_frequency || "monthly";
  const allFunds = funds || [];

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

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Your funds</h1>
          <span className="text-sm text-slate-500">
            Paycheck frequency: <span className="font-medium capitalize">{paycheckFrequency}</span>
          </span>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Average needed per month
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalMonthly)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {SUMMARY_NOTE[paycheckFrequency] || SUMMARY_NOTE.monthly}
          </p>
        </div>

        <FundForm />
        <FundList funds={allFunds} paycheckFrequency={paycheckFrequency} />
      </main>
    </>
  );
}
