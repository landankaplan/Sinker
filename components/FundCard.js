"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePerPaycheck, formatCurrency, formatDate } from "@/lib/calculations";

export default function FundCard({ fund, paycheckFrequency, completed = false }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(fund.name);
  const [editAmount, setEditAmount] = useState(fund.target_amount);
  const [editDate, setEditDate] = useState(String(fund.target_date).slice(0, 10));
  const [contribution, setContribution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const amountSaved = Number(fund.amount_saved || 0);
  const targetAmount = Number(fund.target_amount);
  const remaining = Math.max(0, targetAmount - amountSaved);
  const progressPct = targetAmount > 0 ? Math.min(100, Math.round((amountSaved / targetAmount) * 100)) : 0;

  const { perPaycheck, paychecksRemaining, isPastDue, daysRemaining } = calculatePerPaycheck(
    remaining,
    fund.target_date,
    paycheckFrequency
  );

  async function patchFund(body) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/funds/${fund.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const ok = await patchFund({
      name: editName,
      target_amount: parseFloat(editAmount),
      target_date: editDate,
    });
    if (ok) setIsEditing(false);
  }

  async function handleAddContribution(e) {
    e.preventDefault();
    const amt = parseFloat(contribution);
    if (!amt || amt <= 0) return;
    const ok = await patchFund({ amount_saved: amountSaved + amt });
    if (ok) setContribution("");
  }

  async function handleToggleComplete() {
    await patchFund({ completed_at: fund.completed_at ? null : new Date().toISOString() });
  }

  async function handleDelete() {
    setBusy(true);
    const res = await fetch(`/api/funds/${fund.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  if (isEditing) {
    return (
      <li className="rounded-lg border border-slate-200 bg-white p-4">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">Name</label>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
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
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-slate-500">Due date</label>
            <input
              required
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li
      className={`rounded-lg border p-4 ${
        completed ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-medium text-slate-900">
            {completed && <span className="mr-1 text-green-600">✓</span>}
            {fund.name}
          </p>
          <p className="text-sm text-slate-500">
            {formatCurrency(amountSaved)} of {formatCurrency(targetAmount)} saved
            {completed
              ? ` — completed ${formatDate(fund.completed_at)}`
              : ` — due ${formatDate(fund.target_date)}`}
            {!completed && isPastDue && <span className="ml-2 font-medium text-red-600">past due</span>}
          </p>

          {!completed && (
            <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {!completed && (
          <div className="text-right">
            <p className="font-semibold text-slate-900">
              {formatCurrency(perPaycheck)}
              <span className="text-xs font-normal text-slate-500"> / paycheck</span>
            </p>
            <p className="text-xs text-slate-500">
              {isPastDue
                ? `${Math.abs(daysRemaining)} days overdue`
                : `${paychecksRemaining} paycheck${paychecksRemaining === 1 ? "" : "s"} left`}
            </p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-3">
          {!completed && (
            <button onClick={() => setIsEditing(true)} className="text-sm text-slate-400 hover:text-slate-700">
              Edit
            </button>
          )}
          <button
            onClick={handleToggleComplete}
            disabled={busy}
            className="text-sm text-slate-400 hover:text-slate-700"
          >
            {completed ? "Reopen" : "Mark complete"}
          </button>
          <button onClick={handleDelete} disabled={busy} className="text-sm text-slate-400 hover:text-red-600">
            Delete
          </button>
        </div>
      </div>

      {!completed && (
        <form onSubmit={handleAddContribution} className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Add contribution"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Add
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}
