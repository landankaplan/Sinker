import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Completed funds have nothing left "due" - showing them on the calendar
  // as if they still needed action was the bug (a fully-funded goal kept
  // appearing on its due date forever). Only active funds belong here.
  const { data: funds } = await supabase
    .from("sinking_funds")
    .select("*")
    .is("completed_at", null)
    .order("target_date", { ascending: true });

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink dark:text-cream-50">Calendar</h1>
        <CalendarView funds={funds || []} />
      </main>
    </>
  );
}
