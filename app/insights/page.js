import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import FundsBarChart from "@/components/FundsBarChart";
import { formatCurrency } from "@/lib/calculations";
import {
  calculateSavingStreak,
  summarizeContributions,
  calculateAverageTimeToComplete,
} from "@/lib/insights";

function StatTile({ label, value, note }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-300">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink dark:text-cream-50">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-muted dark:text-ink-300">{note}</p>}
    </div>
  );
}

export default async function InsightsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: funds }, { data: settings }, { data: contributions }] = await Promise.all([
    supabase.from("sinking_funds").select("*").eq("user_id", user.id),
    supabase.from("user_settings").select("paycheck_frequency").eq("user_id", user.id).maybeSingle(),
    // Full history, no date filter - every stat on this page looks at the
    // whole lifetime of the account, not just a recent window.
    supabase.from("fund_contributions").select("amount, contributed_at").eq("user_id", user.id),
  ]);

  const paycheckFrequency = settings?.paycheck_frequency || "monthly";
  const allFunds = funds || [];
  const allContributions = contributions || [];

  const { streak } = calculateSavingStreak(allContributions, paycheckFrequency);
  const contributionStats = summarizeContributions(allContributions);
  const timeToComplete = calculateAverageTimeToComplete(allFunds);

  const activeFunds = allFunds.filter((f) => !f.completed_at);
  const completedFunds = allFunds.filter((f) => f.completed_at);

  // Top 8 active funds by amount saved - a long tail of tiny/new funds
  // wouldn't add anything readable to a bar chart, so it's capped rather
  // than silently trying to cram every fund in.
  const barData = [...activeFunds]
    .sort((a, b) => Number(b.amount_saved || 0) - Number(a.amount_saved || 0))
    .slice(0, 8)
    // `id` rides along so FundsBarChart can key rows by it instead of by
    // name - nothing stops two funds from sharing a name (no uniqueness
    // constraint on sinking_funds.name), and a name-based key would collide
    // for duplicates, causing React to misapply hover/transition state
    // between the two bars.
    .map((f) => ({ id: f.id, label: f.name, value: Number(f.amount_saved || 0) }));
  const droppedFromChart = Math.max(0, activeFunds.length - barData.length);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink dark:text-cream-50">Insights</h1>

        {/* Empty state only when there's truly nothing to show - no funds
            AND no contribution history. Checking allFunds alone was wrong:
            lifetime stats (contributionStats, below) come from
            allContributions, which still includes orphaned rows from
            deleted funds (see supabase/schema.sql's on-delete-set-null
            migration) - so deleting your last fund used to hide real,
            still-valid saved-money history behind this "add a fund" message
            even though the numbers were sitting right there in the data. */}
        {allFunds.length === 0 && allContributions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-100 bg-white p-6 text-center text-sm text-ink-muted dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
            Add a fund and log a few contributions to start seeing insights here.
          </p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Saved all-time" value={formatCurrency(contributionStats.totalAllTime)} />
              <StatTile label="Saved this month" value={formatCurrency(contributionStats.totalThisMonth)} />
              <StatTile label="Saved this year" value={formatCurrency(contributionStats.totalThisYear)} />
              <StatTile
                label="Avg. contribution"
                value={formatCurrency(contributionStats.averageContribution)}
                note={`${contributionStats.contributionCount} logged`}
              />
              <StatTile
                label="Saving streak"
                value={`${streak} ${
                  paycheckFrequency === "weekly" ? "week" : paycheckFrequency === "biweekly" ? "period" : "month"
                }${streak === 1 ? "" : "s"}`}
              />
              <StatTile
                label="Funds completed"
                value={`${completedFunds.length}`}
                note={
                  timeToComplete.applicable
                    ? `~${Math.round(timeToComplete.averageDays)} days on average`
                    : "None yet"
                }
              />
            </div>

            {barData.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
                <h2 className="mb-3 text-sm font-medium text-ink dark:text-cream-50">Amount saved by fund</h2>
                <FundsBarChart bars={barData} />
                {droppedFromChart > 0 && (
                  <p className="mt-2 text-xs text-ink-muted dark:text-ink-300">
                    +{droppedFromChart} more active fund{droppedFromChart === 1 ? "" : "s"} not shown above.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
