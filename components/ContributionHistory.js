"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/calculations";

// Expandable per-fund contribution log, shown inside FundCard. Fetches
// lazily (only once opened) rather than on every card render, since most
// funds' history is never looked at. `onFundUpdated` receives the fresh
// fund row after a correction so FundCard can update its own state (new
// amount_saved, possibly a reopened completed_at) without a full reload.
//
// `refreshToken` is a value that changes whenever the fund's amount_saved
// changes for ANY reason - not just a removal made from inside this
// component (FundCard passes its current amount_saved). Without watching
// this, using the "Add contribution" form elsewhere on the same card while
// History is open would update the running total but leave this list
// showing the old entries until a full page reload.
export default function ContributionHistory({ fundId, onFundUpdated, refreshToken }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contributions, setContributions] = useState(null);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  // Skips the refresh-on-refreshToken-change effect on first mount - only
  // meant to fire on a LATER change while the panel is already open.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (open) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/funds/${fundId}/contributions`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't load history.");
        setContributions([]);
      } else {
        setContributions(data.contributions || []);
      }
    } catch (err) {
      setError("Couldn't reach the server. Check your connection and try again.");
      setContributions([]);
    }
    setLoading(false);
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && contributions === null) {
      await loadHistory();
    }
  }

  async function handleRemove(contributionId) {
    setRemovingId(contributionId);
    setError(null);
    try {
      const res = await fetch(`/api/funds/${fundId}/contributions/${contributionId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't remove that entry.");
      } else {
        setContributions((prev) => (prev || []).filter((c) => c.id !== contributionId));
        if (data.fund) onFundUpdated?.(data.fund);
      }
    } catch (err) {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setRemovingId(null);
    setConfirmingId(null);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs font-medium text-ink-muted underline decoration-dotted hover:text-coral-700 dark:text-ink-300 dark:hover:text-coral-500"
      >
        {open ? "Hide history" : "History"}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-cream-100 bg-cream-50 p-2 dark:border-ink-800 dark:bg-ink-950/40">
          {loading && <p className="text-xs text-ink-muted dark:text-ink-300">Loading…</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          {!loading && contributions && contributions.length === 0 && (
            <p className="text-xs text-ink-muted dark:text-ink-300">No contributions logged yet.</p>
          )}
          {!loading && contributions && contributions.length > 0 && (
            <ul className="flex flex-col gap-1">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink dark:text-cream-50">
                    +{formatCurrency(c.amount)}{" "}
                    <span className="text-ink-muted dark:text-ink-300">on {formatDate(c.contributed_at)}</span>
                  </span>
                  {confirmingId === c.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemove(c.id)}
                        // Disabled while ANY removal on this fund is in
                        // flight, not just this row's - two concurrent
                        // deletes both read the fund's amount_saved before
                        // either writes it back, so the second write can
                        // silently clobber the first (a lost-update race).
                        // Serializing removals one at a time in the UI is
                        // the simplest way to close that off without an
                        // atomic-decrement RPC on the database side.
                        disabled={removingId !== null}
                        className="rounded border border-red-200 px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {removingId === c.id ? "Removing…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={removingId !== null}
                        className="text-ink-muted hover:text-ink disabled:opacity-50 dark:text-ink-300 dark:hover:text-cream-50"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(c.id)}
                      disabled={removingId !== null}
                      className="shrink-0 text-ink-muted hover:text-red-600 disabled:opacity-50 dark:text-ink-300 dark:hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
