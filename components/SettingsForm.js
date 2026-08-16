"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly (every 2 weeks)" },
  { value: "monthly", label: "Monthly" },
];

export default function SettingsForm({
  currentFrequency,
  currentEmailNotificationsEnabled = true,
  emailConfigured = true,
}) {
  const router = useRouter();
  const [frequency, setFrequency] = useState(currentFrequency);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(currentEmailNotificationsEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    let res;
    try {
      res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paycheck_frequency: frequency,
          email_notifications_enabled: emailNotificationsEnabled,
        }),
      });
    } catch (err) {
      setSaving(false);
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    setSaving(false);

    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      // Surface *why* it failed instead of just doing nothing - the most
      // common cause is the database being missing a column this form
      // needs (see supabase/schema.sql), which shows up here as a Postgres
      // error message rather than a generic failure.
      const body = await res.json().catch(() => null);
      setError(body?.error || "Something went wrong saving your settings. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-4 rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900"
    >
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-ink dark:text-cream-50">How often do you get paid?</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded-md border border-cream-100 bg-white px-3 py-2 text-sm text-ink focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-ink-800 dark:bg-ink-900 dark:text-cream-50"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-muted dark:text-ink-300">
          This is used to calculate how much to save per paycheck across all your funds.
        </p>
      </div>

      <div className="border-t border-cream-100 pt-4 dark:border-ink-800">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={emailNotificationsEnabled}
            onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-cream-100 text-coral-600 focus:ring-coral-500 dark:border-ink-800"
          />
          <span className="text-sm font-medium text-ink dark:text-cream-50">Email me reminders</span>
        </label>
        <p className="mt-1 text-xs text-ink-muted dark:text-ink-300">
          Get an email when a fund is due in 7 days or 1 day, and when a fund falls behind an even
          savings pace. At most one alert per fund per week.
        </p>
        {!emailConfigured && (
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
            Email sending isn't configured yet — this will start working once RESEND_API_KEY and
            EMAIL_FROM are set in the app's environment.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </form>
  );
}
