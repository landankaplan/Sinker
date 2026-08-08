import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import FundForm from "@/components/FundForm";
import FundList from "@/components/FundList";

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

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Your sinking funds</h1>
          <span className="text-sm text-slate-500">
            Paycheck frequency: <span className="font-medium capitalize">{paycheckFrequency}</span>
          </span>
        </div>
        <FundForm />
        <FundList funds={funds || []} paycheckFrequency={paycheckFrequency} />
      </main>
    </>
  );
}
