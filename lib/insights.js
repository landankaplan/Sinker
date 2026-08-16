// Dashboard-level insight math: the "how am I doing overall" numbers, as
// opposed to lib/calculations.js which is all per-fund math. Both pure
// functions here take the user's full contribution history (across every
// fund) and derive something from it - no I/O, no Supabase, so each is
// independently testable and reusable between the dashboard page and any
// future surface (email digest, share image, etc).

import { parseDateOnly, toLocalMidnight, INTERVAL_DAYS } from "@/lib/calculations";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "Saving streak": how many pay periods in a row (most recent first) the
// user has logged at least one contribution, on any fund.
//
// Formula (plain English):
//   period_length = the same weekly/biweekly/monthly interval used for the
//     per-paycheck math everywhere else (7 / 14 / 30 days).
//   Divide time into consecutive, back-to-back windows of period_length
//     days, counting backward from today: window 0 is the most recent
//     (and still in progress) window, window 1 is the one before it, etc.
//   Window 0 (today's still-open period) only counts toward the streak if
//     it ALREADY has a contribution logged. If it doesn't, that's not a
//     broken streak - the period genuinely isn't over yet - so counting
//     starts from window 1 (the last fully-completed period) instead.
//   From the starting window, count consecutive windows (in order) that
//     each contain at least one contribution; stop at the first empty one.
//
// Worked example (monthly, period_length = 30 days, today = day 0):
//   Contributions logged on day -2, day -35, day -50, day -95.
//   Window 0 = (day -30, day 0]   -> has day -2   -> counts (streak = 1)
//   Window 1 = (day -60, day -30] -> has day -35, -50 -> counts (streak = 2)
//   Window 2 = (day -90, day -60] -> empty -> stop
//   Result: streak = 2, even though there's a contribution on day -95 -
//   it's outside a continuous run, so it doesn't extend the streak.
//
// Edge cases:
//  - No contributions at all: streak is 0.
//  - Multiple contributions in the same window: still counts as just one
//    "hit" for that window - streaks are per-period, not per-contribution.
//  - Nothing logged yet in today's window, but the last COMPLETED window
//    has a contribution: streak reflects that completed window's count,
//    rather than resetting to 0 just because today hasn't happened yet.
//  - Contributions the caller didn't fetch (outside whatever history
//    window they queried) are simply invisible to this function - a
//    streak can be undercounted this way, but never overcounted.
//
// @param {Array<{contributed_at: string|Date}>} contributions - every
//   contribution across all of the user's funds, in any order.
// @param {'weekly'|'biweekly'|'monthly'} paycheckFrequency
// @param {Date} [today] defaults to now
// @returns {{ streak: number, intervalDays: number }}
export function calculateSavingStreak(contributions, paycheckFrequency, today = new Date()) {
  const intervalDays = INTERVAL_DAYS[paycheckFrequency] || INTERVAL_DAYS.monthly;
  const todayMidnight = toLocalMidnight(today);

  const contributionTimes = (contributions || [])
    .map((c) => toLocalMidnight(c.contributed_at).getTime())
    .filter((t) => !Number.isNaN(t));

  function windowHasContribution(windowIndex) {
    const windowEnd = todayMidnight.getTime() - windowIndex * intervalDays * MS_PER_DAY;
    const windowStart = windowEnd - intervalDays * MS_PER_DAY;
    return contributionTimes.some((t) => t > windowStart && t <= windowEnd);
  }

  let streak = 0;
  let windowIndex;

  if (windowHasContribution(0)) {
    streak = 1;
    windowIndex = 1;
  } else {
    windowIndex = 1;
  }

  while (windowHasContribution(windowIndex)) {
    streak += 1;
    windowIndex += 1;
  }

  return { streak, intervalDays };
}

// Turns a flat list of contributions (any funds, any order) into a daily
// running-total series for a "total saved over time" chart.
//
// Formula (plain English):
//   Sort every contribution by date.
//   running_total starts at 0 and increases by each contribution's amount,
//     in date order.
//   The chart only DISPLAYS the most recent `days` calendar days, but the
//     running total carried INTO that window still includes every earlier
//     contribution - so the first displayed day already shows the true
//     total saved as of that day, not a total that resets to zero.
//   One point per calendar day in the display window (today included),
//     even days with zero contributions, so the line is continuous.
//
// Worked example (days = 3, today = day 0):
//   Contributions: $50 on day -10, $20 on day -1, $5 on day 0.
//   running total before the window (everything before day -2) = $50.
//   day -2: +$0  -> total $50
//   day -1: +$20 -> total $70
//   day  0: +$5  -> total $75
//   Result: [{day -2, 50}, {day -1, 70}, {day 0, 75}]
//
// Edge cases:
//  - No contributions at all: every point is 0 - a flat line at zero.
//  - All contributions before the display window: the whole window is a
//    flat (nonzero) line at the correct running total.
//  - Multiple contributions on the same day: summed into that day's point.
//  - A contribution with an unparseable date is skipped, rather than
//    corrupting the running total with NaN.
//
// @param {Array<{amount: number, contributed_at: string|Date}>} contributions
// @param {{today?: Date, days?: number}} [options]
// @returns {Array<{date: Date, total: number}>}
export function buildCumulativeSavingsSeries(contributions, { today = new Date(), days = 90 } = {}) {
  const todayMidnight = toLocalMidnight(today);

  const sorted = (contributions || [])
    .map((c) => ({ time: toLocalMidnight(c.contributed_at).getTime(), amount: Number(c.amount) }))
    .filter((c) => !Number.isNaN(c.time) && !Number.isNaN(c.amount))
    .sort((a, b) => a.time - b.time);

  const windowStart = todayMidnight.getTime() - (days - 1) * MS_PER_DAY;

  let runningTotal = sorted.filter((c) => c.time < windowStart).reduce((sum, c) => sum + c.amount, 0);

  // Bucket in-window contributions by day so generating points is O(days)
  // instead of re-scanning the whole contribution list for every day.
  const byDay = new Map();
  for (const c of sorted) {
    if (c.time < windowStart) continue;
    byDay.set(c.time, (byDay.get(c.time) || 0) + c.amount);
  }

  const points = [];
  for (let i = 0; i < days; i++) {
    const dayTime = windowStart + i * MS_PER_DAY;
    runningTotal += byDay.get(dayTime) || 0;
    points.push({ date: new Date(dayTime), total: runningTotal });
  }

  return points;
}
