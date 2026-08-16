"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculatePerPaycheck,
  calculateBehindPace,
  calculateShortfallProjection,
  formatCurrency,
  formatDate,
} from "@/lib/calculations";
import MilestoneCelebration from "@/components/MilestoneCelebration";

const inputClass =
  "mt-1 w-full rounded-md border border-cream-100 px-3 py-2 text-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500";

export default function FundCard({ fund, paycheckFrequency, completed = false, recentContributions = [] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(fund.name);
  const [editAmount, setEditAmount] = useState(fund.target_amount);
  const [editDate, setEditDate] = useState(String(fund.target_date).slice(0, 10));
  const [contribution, setContribution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Only ever set true by a same-session transition into "completed" (see
  // patchFund) - never on initial load of an already-completed fund, so
  // reopening the dashboard doesn't re-celebrate every old completion.
  const [showCelebration, setShowCelebration] = useState(false);

  // Mirrors the `fund` prop, but is updated immediately from each PUT
  // response rather than waiting on router.refresh() to deliver fresh
  // props. Without this, two quick "Add contribution" clicks can both
  // read the same stale amount_saved and the second overwrites the first
  // instead of adding to it.
  const [fundState, setFundState] = useState(fund);
  useEffect(() => {
    setFundState(fund);
  }, [fund]);

  const amountSaved = Number(fundState.amount_saved || 0);
  const targetAmount = Number(fundState.target_amount);
  const remaining = Math.max(0, targetAmount - amountSaved);
  // Clamped both directions: the API already rejects negative amount_saved
  // and the DB requires target_amount > 0, so neither should happen in
  // practice - but the bar shouldn't visually break (negative width /
  // overflow) if bad data ever gets in some other way (direct DB edit, etc).
  const progressPct =
    targetAmount > 0 ? Math.max(0, Math.min(100, Math.round((amountSaved / targetAmount) * 100))) : 0;

  const { perPaycheck, paychecksRemaining, isPastDue, daysRemaining } = calculatePerPaycheck(
    remaining,
    fundState.target_date,
    paycheckFrequency
  );

  // Straight-line pace check: are you where you'd need to be if you'd saved
  // evenly since creating this fund? Only meaningful for active funds with a
  // usable created_at/target_date span - see calculateBehindPace's own
  // edge-case handling for when it reports { applicable: false }.
  const behindPace = calculateBehindPace(
    targetAmount,
    fundState.created_at,
    fundState.target_date,
    amountSaved
  );

  // Rate-based projection: at your actual recent contribution pace, will
  // this fund hit its target by the due date? Stays silent (isShortfall
  // false) unless there's both real recent activity AND a genuine gap - see
  // calculateShortfallProjection's own edge-case handling for why "no
  // recent contributions" doesn't count as a shortfall on its own.
  const shortfallProjection = calculateShortfallProjection(
    targetAmount,
    fundState.target_date,
    amountSaved,
    fundState.created_at,
    recentContributions
  );

  const showBehindPace = !completed && behindPace.applicable && behindPace.isBehind;
  const showShortfall = !completed && shortfallProjection.applicable && shortfallProjection.isShortfall;

  async function patchFund(body) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/funds/${fund.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return null;
    }
    // Detect a fresh completion (wasn't completed before this save, is now)
    // before overwriting fundState - covers both the auto-complete-on-
    // contribution path and the manual "Mark complete" toggle.
    if (!fundState.completed_at && data.fund.completed_at) {
      setShowCelebration(true);
    }
    setFundState(data.fund);
    router.refresh();
    return data.fund;
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const updated = await patchFund({
      name: editName,
      target_amount: parseFloat(editAmount),
      target_date: editDate,
    });
    if (updated) setIsEditing(false);
  }

  async function handleAddContribution(e) {
    e.preventDefault();
    const amt = parseFloat(contribution);
    if (!amt || amt <= 0) return;
    const updated = await patchFund({ amount_saved: amountSaved + amt });
    if (updated) setContribution("");
  }

  async function handleToggleComplete() {
    await patchFund({ completed_at: fundState.completed_at ? null : new Date().toISOString() });
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/funds/${fund.id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't delete this fund. Try again.");
      return;
    }
    router.refresh();
  }

  if (isEditing) {
    return (
      <li className="rounded-xl bg-white p-4 shadow-sm">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-muted">Name</label>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-xs font-medium text-ink-muted">Target amount</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-ink-muted">Due date</label>
            <input
              required
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-coral-600 px-3 py-2 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-cream-100 px-3 py-2 text-sm text-ink-muted hover:bg-cream-100"
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
    <li className={`rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md ${completed ? "bg-cream-100/50" : "bg-white"}`}>
      {showCelebration && (
        <MilestoneCelebration fundName={fundState.name} onDismiss={() => setShowCelebration(false)} />
      )}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-medium text-ink">
            {completed && <span className="mr-1 text-green-600">✓</span>}
            {fundState.name}
          </p>
          <p className="text-sm text-ink-muted">
            {formatCurrency(amountSaved)} of {formatCurrency(targetAmount)} saved
            {completed
              ? ` — completed ${formatDate(fundState.completed_at)}`
              : ` — due ${formatDate(fundState.target_date)}`}
            {!completed && isPastDue && <span className="ml-2 font-medium text-red-600">past due</span>}
          </p>

          {!completed && (
            <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-cream-100">
              <div
                className="h-full rounded-full bg-coral-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {(showBehindPace || showShortfall) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {showBehindPace && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {formatCurrency(behindPace.behindBy)} behind pace
                </span>
              )}
              {showShortfall && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  {isPastDue
                    ? `Past due, ${formatCurrency(shortfallProjection.shortfall)} short`
                    : `Projected ${formatCurrency(shortfallProjection.shortfall)} short`}
                </span>
              )}
            </div>
          )}

          {showBehindPace && (
            <p className="mt-1 text-[11px] text-ink-muted">
              You'd have {formatCurrency(behindPace.expectedByNow)} saved by now on an even pace.
            </p>
          )}

          {showShortfall && (
            <p className="mt-1 text-[11px] text-ink-muted">
              At your recent pace of {formatCurrency(shortfallProjection.recentRatePerDay)}/day.
            </p>
          )}
        </div>

        {!completed && (
          <div className="text-left sm:text-right">
            <p className="font-semibold text-ink">
              {formatCurrency(perPaycheck)}
              <span className="text-xs font-normal text-ink-muted"> / paycheck</span>
            </p>
            <p className="text-xs text-ink-muted">
              {isPastDue
                ? `${Math.abs(daysRemaining)} days overdue`
                : `${paychecksRemaining} paycheck${paychecksRemaining === 1 ? "" : "s"} left`}
            </p>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <a
            href={`/api/funds/${fund.id}/share-image`}
            download
            className="text-sm text-ink-muted hover:text-coral-700"
          >
            Share
          </a>
          {!completed && (
            <button onClick={() => setIsEditing(true)} className="text-sm text-ink-muted hover:text-coral-700">
              Edit
            </button>
          )}
          <button
            onClick={handleToggleComplete}
            disabled={busy}
            className="text-sm text-ink-muted hover:text-coral-700"
          >
            {completed ? "Reopen" : "Mark complete"}
          </button>
          <button onClick={handleDelete} disabled={busy} className="text-sm text-ink-muted hover:text-red-600">
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
            className="w-40 rounded-md border border-cream-100 px-2 py-1 text-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-cream-100 px-3 py-1 text-sm text-ink hover:bg-cream-100"
          >
            Add
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}
