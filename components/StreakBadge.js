// Small presentational badge - the streak number itself is computed
// server-side by lib/insights.js's calculateSavingStreak (see app/page.js)
// so this component just renders it.
export default function StreakBadge({ streak, paycheckFrequency }) {
  if (!streak || streak <= 0) return null;

  const unit = paycheckFrequency === "weekly" ? "week" : paycheckFrequency === "biweekly" ? "pay period" : "month";

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-xs font-semibold text-coral-700">
      🔥 {streak} {unit}
      {streak === 1 ? "" : "s"} in a row
    </span>
  );
}
