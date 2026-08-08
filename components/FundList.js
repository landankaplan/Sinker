"use client";

import FundCard from "@/components/FundCard";
import { parseDateOnly } from "@/lib/calculations";

export default function FundList({ funds, paycheckFrequency, recentContributionsByFund = {} }) {
  if (funds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-3xl">🎯</p>
        <p className="mt-2 text-base font-semibold text-slate-900">Nothing tracked yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          A sinking fund is just a bill or goal you know is coming — Sinker figures out exactly how much
          to set aside from each paycheck so it's ready when it's due.
        </p>
        <a
          href="#fund-form"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add your first fund ↑
        </a>
      </div>
    );
  }

  const active = funds
    .filter((f) => !f.completed_at)
    // parseDateOnly for consistency with the rest of the app - target_date
    // is a bare calendar date, not a timestamp (completed_at below is a
    // real timestamp, so it correctly stays on plain new Date()).
    .sort((a, b) => parseDateOnly(a.target_date) - parseDateOnly(b.target_date));
  const completed = funds
    .filter((f) => f.completed_at)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  return (
    <div className="flex flex-col gap-6">
      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
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

      {completed.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">Completed</h2>
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
