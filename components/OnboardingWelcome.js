"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly (every 2 weeks)" },
  { value: "monthly", label: "Monthly" },
];

const STEPS = [
  {
    emoji: "🎯",
    title: "Add a fund",
    body: "Tell StayAhead about a bill or goal you know is coming — a name, how much it costs, and when it's due.",
  },
  {
    emoji: "💵",
    title: "Log what you save",
    body: "Add a contribution any time you set money aside. StayAhead keeps a running total and shows your progress.",
  },
  {
    emoji: "🔔",
    title: "Get reminded",
    body: "StayAhead does the math for how much to save each paycheck, and can email you if a due date is close or you fall behind.",
  },
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

    let res;
    try {
      res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paycheck_frequency: chosenFrequency }),
      });
    } catch (err) {
      setSubmitting(false);
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Couldn't save that. Try again.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
      <div className="p-5 pb-4">
        <p className="text-lg font-semibold text-ink dark:text-cream-50">Welcome to StayAhead 👋</p>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-300">
          Three quick things to know before you get started:
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 border-t border-cream-100 p-5 pt-4 dark:border-ink-800 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col items-start gap-1.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-50 text-base dark:bg-coral-950/30"
              aria-hidden="true"
            >
              {step.emoji}
            </span>
            <p className="text-sm font-semibold text-ink dark:text-cream-50">
              {i + 1}. {step.title}
            </p>
            <p className="text-xs text-ink-muted dark:text-ink-300">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="border-t border-cream-100 bg-cream-50/60 p-5 dark:border-ink-800 dark:bg-ink-950/40">
        <p className="text-xs font-medium text-ink-muted dark:text-ink-300">One thing first — how often do you get paid?</p>
        <p className="mt-1 text-xs text-ink-muted dark:text-ink-300">
          This is used everywhere in the app, so getting it right now saves you from redoing the math later.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full rounded-md border border-cream-100 bg-white px-3 py-2 text-sm text-ink focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-ink-800 dark:bg-ink-900 dark:text-cream-50"
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
            className="text-sm text-ink-muted hover:text-ink dark:text-ink-300 dark:hover:text-cream-50"
          >
            Skip — assume monthly
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
