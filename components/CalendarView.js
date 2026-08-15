"use client";

import { useMemo, useState } from "react";
import { formatCurrency, parseDateOnly } from "@/lib/calculations";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarView({ funds }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const fundsByDay = useMemo(() => {
    const map = {};
    for (const fund of funds) {
      // parseDateOnly, not new Date() - target_date is a bare calendar date
      // and raw new Date() parsing would bucket it under the wrong day for
      // any viewer west of UTC (see lib/calculations.js for the full
      // explanation of this bug class).
      const d = parseDateOnly(fund.target_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = map[day] || [];
        map[day].push(fund);
      }
    }
    return map;
  }, [funds, year, month]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-cream-100"
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <h2 className="text-sm font-semibold text-ink">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-cream-100"
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="mb-3 text-xs font-medium text-ink-muted underline"
        >
          Jump to today
        </button>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-muted">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayFunds = day ? fundsByDay[day] || [] : [];
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div
              key={i}
              className={`min-h-[64px] rounded-md border p-1 text-xs ${
                day ? "border-cream-100" : "border-transparent"
              } ${isToday ? "border-coral-600" : ""}`}
            >
              {day && (
                <>
                  <div className={`mb-1 ${isToday ? "font-bold text-coral-600" : "text-ink-muted"}`}>
                    {day}
                  </div>
                  {dayFunds.map((fund) => (
                    <div
                      key={fund.id}
                      title={`${fund.name} — ${formatCurrency(fund.target_amount)}`}
                      className="mb-1 truncate rounded bg-coral-600 px-1 py-0.5 text-[10px] text-white"
                    >
                      {fund.name}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {funds.length === 0 && (
        <p className="mt-4 text-center text-sm text-ink-muted">
          No funds yet — add one from the Funds tab and it'll show up here on its due date.
        </p>
      )}
    </div>
  );
}
