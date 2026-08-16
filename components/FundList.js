"use client";

import { useState } from "react";
import FundCard from "@/components/FundCard";
import { parseDateOnly } from "@/lib/calculations";

// Sort options for the ACTIVE list only - "Completed" always stays sorted
// most-recently-finished-first, since that's the one order that's actually
// useful for a list you're mostly scanning to confirm "yeah, done."
const SORT_OPTIONS = [
  { value: "due_date", label: "Due date (soonest first)" },
  { value: "name", label: "Name (A–Z)" },
  { value: "remaining", label: "Amount left (highest first)" },
  { value: "progress", label: "Progress (least funded first)" },
];

function sortActive(funds, sortBy) {
  const copy = [...funds];
  switch (sortBy) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "remaining":
      return copy.sort((a, b) => {
        const remainingA = Number(a.target_amount) - Number(a.amount_saved || 0);
        const remainingB = Number(b.target_amount) - Number(b.amount_saved || 0);
        return remainingB - remainingA;
      });
    case "progress":
      return copy.sort((a, b) => {
        const pctA = Number(a.target_amount) > 0 ? Number(a.amount_saved || 0) / Number(a.target_amount) : 0;
        const pctB = Number(b.target_amount) > 0 ? Number(b.amount_saved || 0) / Number(b.target_amount) : 0;
        return pctA - pctB;
      });
    case "due_date":
    default:
      // parseDateOnly for consistency with the rest of the app - target_date
      // is a bare calendar date, not a timestamp.
      return copy.sort((a, b) => parseDateOnly(a.target_date) - parseDateOnly(b.target_date));
  }
}

export default function FundList({ funds, paycheckFrequency, recentContributionsByFund = {} }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("due_date");

  if (funds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-100 bg-white p-8 text-center dark:border-ink-800 dark:bg-ink-900">
        <p className="text-3xl">🎯</p>
        <p className="mt-2 text-base font-semibold text-ink dark:text-cream-50">Nothing tracked yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted dark:text-ink-300">
          A sinking fund is just a bill or goal you know is coming — StayAhead figures out exactly how much
          to set aside from each paycheck so it's ready when it's due.
        </p>
        <a
          href="#fund-form"
          className="mt-4 inline-block rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700"
        >
          Add your first fund ↑
        </a>
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const matches = (fund) => !query || fund.name.toLowerCase().includes(query);

  // Plain computation, not memoized: these lists are a handful of items at
  // most for this app, so re-sorting/re-filtering on every render is cheap
  // and keeps this a plain function call instead of a hook - important
  // because it runs after the early return above, and hooks can't be
  // called conditionally.
  const active = sortActive(funds.filter((f) => !f.completed_at && matches(f)), sortBy);
  const completed = funds
    .filter((f) => f.completed_at && matches(f))
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  const totalActiveCount = funds.filter((f) => !f.completed_at).length;
  const totalCompletedCount = funds.filter((f) => f.completed_at).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search funds by name…"
          aria-label="Search funds by name"
          className="min-w-0 flex-1 rounded-md border border-cream-100 bg-white px-3 py-2 text-sm text-ink focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-ink-800 dark:bg-ink-900 dark:text-cream-50"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort active funds by"
          className="rounded-md border border-cream-100 bg-white px-2 py-2 text-sm text-ink focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-ink-800 dark:bg-ink-900 dark:text-cream-50"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {query && active.length === 0 && completed.length === 0 && (
        <p className="rounded-xl border border-dashed border-cream-100 bg-white p-6 text-center text-sm text-ink-muted dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
          No funds match "{search.trim()}".
        </p>
      )}

      {(!query || active.length > 0) && (
        <div>
          {active.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream-100 bg-white p-6 text-center text-sm text-ink-muted dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
              All caught up — no active funds right now.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {active.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  paycheckFrequency={paycheckFrequency}
                  recentContributions={recentContributionsByFund[fund.id] || []}
                />
              ))}
            </ul>
          )}
          {query && active.length !== totalActiveCount && (
            <p className="mt-1 text-xs text-ink-muted dark:text-ink-300">
              Showing {active.length} of {totalActiveCount} active funds.
            </p>
          )}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink-muted dark:text-ink-300">
            Completed
            {query && ` (${completed.length} of ${totalCompletedCount})`}
          </h2>
          <ul className="flex flex-col gap-2">
            {completed.map((fund) => (
              <FundCard key={fund.id} fund={fund} paycheckFrequency={paycheckFrequency} completed />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
