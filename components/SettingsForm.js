"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly (every 2 weeks)" },
  { value: "monthly", label: "Monthly" },
];

export default function SettingsForm({ currentFrequency }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState(currentFrequency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paycheck_frequency: frequency }),
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
      className="flex max-w-sm flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <label className="text-sm font-medium text-slate-700">
        How often do you get paid?
      </label>
      <select
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">
        This is used to calculate how much to save per paycheck across all your funds.
      </p>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </form>
  );
}
