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
