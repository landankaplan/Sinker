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
        <h1 className="mb-6 text-xl font-semibold text-ink">Settings</h1>
        <SettingsForm
          currentFrequency={settings?.paycheck_frequency || "monthly"}
          currentEmailNotificationsEnabled={settings?.email_notifications_enabled ?? true}
          emailConfigured={emailConfigured}
        />
      </main>
    </>
  );
}
