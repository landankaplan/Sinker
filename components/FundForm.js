"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  { name: "Car insurance", amount: "600" },
  { name: "Holiday gifts", amount: "300" },
  { name: "Emergency fund", amount: "1000" },
];

const inputClass =
  "mt-1 w-full rounded-md border border-cream-100 bg-white px-3 py-2 text-sm text-ink focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-ink-800 dark:bg-ink-900 dark:text-cream-50";

export default function FundForm({ showExamples = false }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function applyExample(example) {
    setName(example.name);
    setTargetAmount(example.amount);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let res;
    try {
      res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          target_amount: parseFloat(targetAmount),
          target_date: targetDate,
        }),
      });
    } catch (err) {
      // A network failure throws before a response exists - without this
      // catch, submitting never flips back to false and "Add fund" stays
      // disabled forever with no explanation. See SettingsForm.js for the
      // same pattern.
      setSubmitting(false);
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong creating that fund.");
      return;
    }

    setName("");
    setTargetAmount("");
    setTargetDate("");
    router.refresh();
  }

  return (
    <form
      id="fund-form"
      onSubmit={handleSubmit}
      className="mb-6 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900"
    >
      {showExamples && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-muted dark:text-ink-300">Try an example:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => applyExample(example)}
              className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-ink-muted hover:bg-coral-50 hover:text-coral-600 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-coral-500"
            >
              {example.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-ink-muted dark:text-ink-300">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Car Insurance"
            className={inputClass}
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-ink-muted dark:text-ink-300">Target amount</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="600"
            className={inputClass}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-ink-muted dark:text-ink-300">Due date</label>
          <input
            required
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Adding…" : "Add fund"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
