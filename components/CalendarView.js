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
  // Which day number is expanded for detail, or null. Tapping a day with
  // funds toggles this - separate from hover/title tooltips (which don't
  // exist at all on touch devices, so this is the only way to see amounts
  // on a phone).
  const [selectedDay, setSelectedDay] = useState(null);

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
          onClick={() => {
            setCursor(new Date(year, month - 1, 1));
            setSelectedDay(null);
          }}
          className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-cream-100"
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <h2 className="text-sm font-semibold text-ink">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={() => {
            setCursor(new Date(year, month + 1, 1));
            setSelectedDay(null);
          }}
          className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-cream-100"
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          onClick={() => {
            setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelectedDay(null);
          }}
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
          const hasFunds = dayFunds.length > 0;
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = day === selectedDay;

          // Only days WITH funds are interactive - an empty day has nothing
          // to expand, so it stays a plain (non-focusable, non-clickable)
          // cell rather than a button that does nothing.
          const Cell = hasFunds ? "button" : "div";

          return (
            <Cell
              key={i}
              type={hasFunds ? "button" : undefined}
              onClick={hasFunds ? () => setSelectedDay(isSelected ? null : day) : undefined}
              aria-label={hasFunds ? `${MONTH_NAMES[month]} ${day} — ${dayFunds.length} fund${dayFunds.length === 1 ? "" : "s"} due, tap for details` : undefined}
              className={`min-h-[64px] rounded-md border p-1 text-left text-xs transition-colors ${
                day ? "border-cream-100" : "border-transparent"
              } ${isToday ? "border-coral-600" : ""} ${hasFunds ? "cursor-pointer hover:bg-cream-100" : ""} ${
                isSelected ? "bg-coral-50 ring-1 ring-coral-500" : ""
              }`}
            >
              {day && (
                <>
                  <div className={`mb-1 ${isToday ? "font-bold text-coral-600" : "text-ink-muted"}`}>
                    {day}
                  </div>
                  {dayFunds.map((fund) => (
                    <div
                      key={fund.id}
                      className="mb-1 truncate rounded bg-coral-600 px-1 py-0.5 text-[10px] text-white"
                    >
                      {fund.name}
                    </div>
                  ))}
                </>
              )}
            </Cell>
          );
        })}
      </div>

      {selectedDay && (fundsByDay[selectedDay] || []).length > 0 && (
        <div className="mt-3 rounded-lg border border-coral-500/30 bg-coral-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">
              Due {MONTH_NAMES[month]} {selectedDay}
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-ink-muted hover:text-ink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {(fundsByDay[selectedDay] || []).map((fund) => (
              <li key={fund.id} className="flex items-center justify-between text-xs">
                <span className="text-ink">{fund.name}</span>
                <span className="font-medium text-ink-muted">{formatCurrency(fund.target_amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {funds.length === 0 && (
        <p className="mt-4 text-center text-sm text-ink-muted">
          No funds yet — add one from the Funds tab and it'll show up here on its due date.
        </p>
      )}
    </div>
  );
}
