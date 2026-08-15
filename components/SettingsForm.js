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

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paycheck_frequency: frequency,
        email_notifications_enabled: emailNotificationsEnabled,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-4 rounded-xl bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-ink">How often do you get paid?</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded-md border border-cream-100 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-muted">
          This is used to calculate how much to save per paycheck across all your funds.
        </p>
      </div>

      <div className="border-t border-cream-100 pt-4">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={emailNotificationsEnabled}
            onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-cream-100 text-coral-600 focus:ring-coral-500"
          />
          <span className="text-sm font-medium text-ink">Email me reminders</span>
        </label>
        <p className="mt-1 text-xs text-ink-muted">
          Get an email when a fund is due in 7 days or 1 day, and when a fund falls behind an even
          savings pace. At most one alert per fund per week.
        </p>
        {!emailConfigured && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            Email sending isn't configured yet — this will start working once RESEND_API_KEY and
            EMAIL_FROM are set in the app's environment.
          </p>
        )}
      </div>

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
