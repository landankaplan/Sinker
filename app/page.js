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

  const totalMonthly = allFunds
    .filter((f) => !f.completed_at)
    .reduce((sum, fund) => {
      const remaining = Math.max(0, Number(fund.target_amount) - Number(fund.amount_saved || 0));
      const { perPaycheck } = calculatePerPaycheck(remaining, fund.target_date, paycheckFrequency);
      return sum + toMonthlyAmount(perPaycheck, paycheckFrequency);
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
            Total needed this month
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalMonthly)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Across all active funds, based on your {paycheckFrequency} paycheck.
          </p>
        </div>

        <FundForm />
        <FundList funds={allFunds} paycheckFrequency={paycheckFrequency} />
      </main>
    </>
  );
}
