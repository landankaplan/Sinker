"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly (every 2 weeks)" },
  { value: "monthly", label: "Monthly" },
];

// Shown only when this user has never saved a row in user_settings yet -
// see app/page.js, which passes settings straight through (no default
// applied) so `null` here means "genuinely never asked," not "chose
// monthly." Paycheck frequency feeds every dollar figure in the app (per-
// paycheck amounts, the monthly summary, behind-pace, shortfall projection),
// so getting it right before the first fund is created matters more than
// most settings.
export default function OnboardingWelcome() {
  const router = useRouter();
  const [frequency, setFrequency] = useState("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function save(chosenFrequency) {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paycheck_frequency: chosenFrequency }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save that. Try again.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
      <p className="text-lg font-semibold text-ink">Welcome to Sinker 👋</p>
      <p className="mt-1 text-sm text-ink-muted">
        Sinker figures out exactly how much to set aside from each paycheck for bills and goals you know
        are coming. One quick thing first — how often do you get paid? This is used everywhere in the
        app, so getting it right now saves you from redoing the math later.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-ink-muted">Paycheck frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="mt-1 w-full rounded-md border border-cream-100 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500"
          >
            {OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => save(frequency)}
          disabled={submitting}
          className="w-full rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Saving…" : "Get started"}
        </button>
        <button
          type="button"
          onClick={() => save("monthly")}
          disabled={submitting}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Skip — assume monthly
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
