// Core math for the app: given a target amount/date and a paycheck
// frequency, figure out how much to set aside per paycheck.

// `target_date` and `created_at` are Postgres `date` columns - plain
// calendar dates, no time or timezone attached (e.g. "2026-11-13"). Passing
// a bare date-only string straight to `new Date(...)` is a well-known JS
// footgun: the spec parses date-only ISO strings as UTC MIDNIGHT, but every
// way of reading a Date back out (toLocaleDateString(), getFullYear(),
// setHours(), etc.) uses the LOCAL timezone of whatever machine is running
// the code. Mix those two and the same stored date renders as a DIFFERENT
// calendar day depending on where the code executes - which is exactly
// what caused the same fund to show "Nov 12" on the browser-rendered Funds
// page (US timezones, behind UTC) and correctly "Nov 13" on the
// server-rendered (UTC) share image.
//
// parseDateOnly sidesteps this by building the Date from its year/month/day
// parts directly via the multi-argument Date constructor, which - unlike
// the string-parsing constructor - always interprets those parts as LOCAL,
// with no UTC special case. That makes it represent the same calendar day
// everywhere, no matter what timezone the code runs in, because both the
// construction and every later read use the same (local, ambient) zone.
export function parseDateOnly(dateStr) {
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const [year, month, day] = String(dateStr).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

// Every calculation below needs "today" (or a caller-supplied "as of" date)
// reduced to local midnight, so it can be diffed in whole days against
// target/created. The default (`fromDate = new Date()`) is always a real
// instant, so truncating its LOCAL hour to 0 is correct and intentional -
// unlike target_date/created_at, "today" should follow the viewer's own
// calendar day, the same way CalendarView's "today" does. But if a caller
// ever passes a bare "YYYY-MM-DD" string instead (an explicit "as of" date,
// or a test), it needs the same parseDateOnly treatment as target/created -
// otherwise it would quietly reintroduce this file's whole bug class on the
// "from" side instead of the "target" side.
export function toLocalMidnight(dateInput) {
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return parseDateOnly(dateInput);
  }
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

const INTERVAL_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

/**
 * @param {number} targetAmount
 * @param {string|Date} targetDate
 * @param {'weekly'|'biweekly'|'monthly'} frequency
 * @param {Date} [fromDate] defaults to today
 */
export function calculatePerPaycheck(targetAmount, targetDate, frequency, fromDate = new Date()) {
  const target = parseDateOnly(targetDate);

  const from = toLocalMidnight(fromDate);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((target.getTime() - from.getTime()) / msPerDay);
  const isPastDue = daysRemaining < 0;

  const intervalDays = INTERVAL_DAYS[frequency] || INTERVAL_DAYS.monthly;
  // Use floor, not ceil: a paycheck that lands AFTER the due date doesn't
  // help you hit it, so only count paychecks that actually occur by then.
  // (Math.max(1, ...) still guarantees at least one paycheck to save in.)
  const paychecksRemaining = isPastDue ? 0 : Math.max(1, Math.floor(daysRemaining / intervalDays));
  const perPaycheck = isPastDue ? targetAmount : targetAmount / paychecksRemaining;

  return {
    daysRemaining,
    paychecksRemaining,
    perPaycheck,
    isPastDue,
  };
}

// Average paychecks per month for each frequency, used to convert a
// per-paycheck amount into a "per month" equivalent for the summary total.
const PAYCHECKS_PER_MONTH = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
};

export function toMonthlyAmount(perPaycheckAmount, frequency) {
  return perPaycheckAmount * (PAYCHECKS_PER_MONTH[frequency] || 1);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Used for both bare calendar dates (target_date, created_at) and real
// timestamps (completed_at). Bare "YYYY-MM-DD" strings go through
// parseDateOnly (see above) so they render the same everywhere; anything
// else (a real timestamptz, or an already-constructed Date) is parsed
// normally, since it's an unambiguous instant with no UTC-vs-local
// ambiguity to correct for.
export function formatDate(dateStr) {
  const isDateOnly = typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const d = isDateOnly ? parseDateOnly(dateStr) : new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// "Funded ahead of schedule": did this fund get completed before its due
// date? completed_at is a real timestamp (unambiguous instant) - we reduce
// it to the local calendar day it fell on. target_date is a bare calendar
// date, parsed via parseDateOnly like everywhere else in this file, so the
// comparison holds regardless of which timezone evaluates it. A fund
// completed on the due date itself (any time of day) reads as on-time, not
// ahead - see calculatePerPaycheck's isPastDue for the matching convention.
export function isAheadOfSchedule(completedAt, targetDate) {
  if (!completedAt) return false;
  const completed = new Date(completedAt);
  completed.setHours(0, 0, 0, 0);
  const target = parseDateOnly(targetDate);
  return completed.getTime() < target.getTime();
}

// "Behind pace" insight: are you on track for a *straight-line* savings pace
// between when you created the fund and its due date?
//
// Formula (plain English):
//   total_days     = due date − created date, in days
//   elapsed_days   = today − created date, in days, clamped to [0, total_days]
//   expected_by_now = target_amount × (elapsed_days / total_days)
//   behind_by      = max(0, expected_by_now − amount_saved)
//
// In words: if you were saving in a perfectly even straight line from the
// day you created the fund to its due date, expected_by_now is how much
// you'd have banked by today. behind_by is how much short of that pace you
// currently are (never negative — being ahead of pace isn't "behind").
//
// Edge cases:
//  - total_days <= 0 (bad/missing created_at, or a due date on/before the
//    creation date) or a non-positive target_amount: the ratio is
//    meaningless, so we return { applicable: false } and the caller should
//    hide the insight rather than divide by zero or show garbage.
//  - Fund created "in the future" relative to `fromDate` (clock skew, bad
//    data): raw elapsed days would be negative, so we clamp to 0 —
//    expected_by_now becomes $0 and you're never flagged as behind for a
//    fund that hasn't started yet.
//  - Past-due fund (today is after the due date): raw elapsed days would
//    exceed total_days, so we clamp to total_days — expected_by_now becomes
//    the full target_amount, i.e. by now you should have saved all of it.
//  - Leap years: no special-casing needed. We diff real JS Date objects
//    (which correctly account for Feb 29), not a fixed 365-day estimate.
//  - $0 already saved, or already fully saved: fall out naturally from the
//    subtraction above — no separate branch required.
//
// @param {number} targetAmount
// @param {string|Date} createdAt
// @param {string|Date} targetDate
// @param {number} amountSaved
// @param {Date} [fromDate] defaults to today
export function calculateBehindPace(targetAmount, createdAt, targetDate, amountSaved, fromDate = new Date()) {
  const created = parseDateOnly(createdAt);
  const target = parseDateOnly(targetDate);

  const from = toLocalMidnight(fromDate);

  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((target.getTime() - created.getTime()) / msPerDay);

  if (!(totalDays > 0) || !(Number(targetAmount) > 0) || Number.isNaN(created.getTime())) {
    return { applicable: false, expectedByNow: 0, behindBy: 0, isBehind: false };
  }

  const rawElapsedDays = Math.round((from.getTime() - created.getTime()) / msPerDay);
  const elapsedDays = Math.max(0, Math.min(totalDays, rawElapsedDays));

  const expectedByNow = Number(targetAmount) * (elapsedDays / totalDays);
  const behindBy = Math.max(0, expectedByNow - Number(amountSaved));

  // Treat sub-cent differences as "on pace" rather than flagging rounding
  // noise as behind.
  return { applicable: true, expectedByNow, behindBy, isBehind: behindBy > 0.005 };
}

// "Shortfall projection": at your actual recent contribution rate, will this
// fund hit its target by the due date?
//
// Formula (plain English):
//   days_since_created = today − created_at
//   window_days        = min(30, days_since_created)
//   window_start        = today − window_days
//   recent_contributions = sum of this fund's contributions with
//                           contributed_at between window_start and today
//   recent_rate_per_day = recent_contributions / window_days
//   days_remaining      = max(0, target_date − today)
//   projected_final     = amount_saved + (recent_rate_per_day × days_remaining)
//   shortfall           = max(0, target_amount − projected_final)
//
// Unlike calculateBehindPace (which compares you to an ideal straight-line
// pace since creation), this looks at what you've *actually* been doing
// lately and projects it forward — it can tell you "you're behind ideal
// pace but trending fine" or "you're on ideal pace today but about to miss
// it if your recent slowdown continues."
//
// Edge cases:
//  - window_days <= 0 (fund created today, no history yet) or a
//    non-positive target_amount / bad created_at: not enough data to
//    project from, so we return { applicable: false } rather than a
//    misleading number.
//  - No contributions inside the window: recent_rate_per_day is 0, which
//    would make shortfall = target_amount − amount_saved (the FULL
//    remaining balance) even for a fund that's mostly funded but just
//    hasn't had a contribution logged this month. That's misleading, not
//    informative, so callers should treat hasRecentActivity === false as
//    "no projection to show" rather than displaying that number.
//  - Fund younger than 30 days: uses the fund's actual age as the window
//    instead of a fixed 30, so a 5-day-old fund's rate isn't diluted by 25
//    days that didn't exist.
//  - Past-due fund: days_remaining clamps to 0, so projected_final is just
//    whatever's saved right now (no time left to add anything) - the
//    shortfall is the honest remaining gap, not a number implying more time
//    is left.
//  - Leap years: no special-casing needed - real Date-object diffing.
//  - Contributing well above pace: shortfall clamps to 0 via Math.max, never
//    negative.
//
// @param {number} targetAmount
// @param {string|Date} targetDate
// @param {number} amountSaved
// @param {string|Date} createdAt
// @param {Array<{amount: number, contributed_at: string|Date}>} contributions
// @param {Date} [fromDate] defaults to today
export function calculateShortfallProjection(
  targetAmount,
  targetDate,
  amountSaved,
  createdAt,
  contributions,
  fromDate = new Date()
) {
  const target = parseDateOnly(targetDate);
  const created = parseDateOnly(createdAt);

  const from = toLocalMidnight(fromDate);

  const msPerDay = 24 * 60 * 60 * 1000;

  if (!(Number(targetAmount) > 0) || Number.isNaN(created.getTime())) {
    return { applicable: false, projectedFinal: 0, shortfall: 0, hasRecentActivity: false, isShortfall: false };
  }

  const daysSinceCreated = Math.max(0, Math.round((from.getTime() - created.getTime()) / msPerDay));
  const windowDays = Math.min(30, daysSinceCreated);

  if (windowDays <= 0) {
    return { applicable: false, projectedFinal: 0, shortfall: 0, hasRecentActivity: false, isShortfall: false };
  }

  const windowStart = new Date(from.getTime() - windowDays * msPerDay);
  const recentContributions = (contributions || [])
    .filter((c) => {
      const d = new Date(c.contributed_at);
      return d.getTime() >= windowStart.getTime() && d.getTime() <= from.getTime();
    })
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const recentRatePerDay = recentContributions / windowDays;
  const hasRecentActivity = recentContributions > 0;

  const daysRemaining = Math.max(0, Math.round((target.getTime() - from.getTime()) / msPerDay));
  const projectedFinal = Number(amountSaved) + recentRatePerDay * daysRemaining;
  const shortfall = Math.max(0, Number(targetAmount) - projectedFinal);

  return {
    applicable: true,
    hasRecentActivity,
    recentRatePerDay,
    daysRemaining,
    projectedFinal,
    shortfall,
    // Only a "real" shortfall if there's actual recent data behind it -
    // otherwise it's noise, not a signal (see edge cases above).
    isShortfall: hasRecentActivity && shortfall > 0.005,
  };
}
