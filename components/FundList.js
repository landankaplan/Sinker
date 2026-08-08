"use client";

import { useRouter } from "next/navigation";
import { calculatePerPaycheck, formatCurrency, formatDate } from "@/lib/calculations";

export default function FundList({ funds, paycheckFrequency }) {
  const router = useRouter();

  async function handleDelete(id) {
    const res = await fetch(`/api/funds/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  if (funds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No sinking funds yet — add your first one above (e.g. "Car Insurance, $600, due March 15").
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {funds.map((fund) => {
        const { perPaycheck, paychecksRemaining, isPastDue, daysRemaining } = calculatePerPaycheck(
          Number(fund.target_amount),
          fund.target_date,
          paycheckFrequency
        );

        return (
          <li
            key={fund.id}
            className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-medium text-slate-900">{fund.name}</p>
              <p className="text-sm text-slate-500">
                {formatCurrency(fund.target_amount)} due {formatDate(fund.target_date)}
                {isPastDue && <span className="ml-2 font-medium text-red-600">past due</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
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
              <button
                onClick={() => handleDelete(fund.id)}
                className="text-sm text-slate-400 hover:text-red-600"
                aria-label={`Delete ${fund.name}`}
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
