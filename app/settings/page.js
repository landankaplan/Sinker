import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_settings")
    .select("paycheck_frequency, email_notifications_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  // Read server-side only (never sent to the client) - this just decides
  // whether to show a "not fully set up yet" note next to the toggle.
  // Landan still owns/configures the env vars himself; this isn't a
  // per-user setting.
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink dark:text-cream-50">Settings</h1>
        <SettingsForm
          currentFrequency={settings?.paycheck_frequency || "monthly"}
          currentEmailNotificationsEnabled={settings?.email_notifications_enabled ?? true}
          emailConfigured={emailConfigured}
        />

        <div className="mt-6 max-w-sm rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
          <h2 className="text-sm font-medium text-ink dark:text-cream-50">Export your data</h2>
          <p className="mt-1 text-xs text-ink-muted dark:text-ink-300">
            Download every fund and its full contribution history as a spreadsheet-ready CSV file.
          </p>
          <a
            href="/api/export"
            className="mt-3 inline-block rounded-md border border-cream-100 px-4 py-2 text-sm font-medium text-ink hover:bg-cream-100 dark:border-ink-800 dark:text-cream-50 dark:hover:bg-ink-800"
          >
            Download CSV
          </a>
        </div>
      </main>
    </>
  );
}
