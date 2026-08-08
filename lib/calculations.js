// Core math for the app: given a target amount/date and a paycheck
// frequency, figure out how much to set aside per paycheck.

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
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

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

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
  const created = new Date(createdAt);
  created.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

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
