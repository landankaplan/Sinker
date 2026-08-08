"use client";

import FundCard from "@/components/FundCard";

export default function FundList({ funds, paycheckFrequency }) {
  if (funds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No funds yet — add your first one above (e.g. "Car Insurance, $600, due March 15").
      </p>
    );
  }

  const active = funds
    .filter((f) => !f.completed_at)
    .sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
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
            <FundCard key={fund.id} fund={fund} paycheckFrequency={paycheckFrequency} />
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
