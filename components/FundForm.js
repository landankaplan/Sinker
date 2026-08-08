"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  { name: "Car insurance", amount: "600" },
  { name: "Holiday gifts", amount: "300" },
  { name: "Emergency fund", amount: "1000" },
];

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

    const res = await fetch("/api/funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        target_amount: parseFloat(targetAmount),
        target_date: targetDate,
      }),
    });

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
      className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      {showExamples && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Try an example:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => applyExample(example)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              {example.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Car Insurance"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-slate-500">Target amount</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="600"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-slate-500">Due date</label>
          <input
            required
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Adding…" : "Add fund"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
