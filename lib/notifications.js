// Pure decision functions for the email-notifications feature: given a
// fund's numbers (and, for the underfunded alert, when it was last
// alerted), decide WHETHER to notify today. No I/O, no Supabase, no Resend
// in this file on purpose - it's the one place the "should we send this?"
// logic lives, so it can be reasoned about (and manually verified) on its
// own, separately from the cron route's plumbing.
//
// Both functions reuse parseDateOnly/toLocalMidnight from calculations.js
// rather than re-deriving date math, so they inherit the same timezone
// correctness already established (and audited) there.

import { parseDateOnly, toLocalMidnight } from "@/lib/calculations";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "Due-soon" reminder: fire once when a fund crosses exactly 7 days out,
// and once more when it crosses exactly 1 day out.
//
// Formula (plain English):
//   days_until_due = target_date − today, in whole calendar days
//   if remaining <= 0: nothing left to remind about, skip
//   if days_until_due === 7: "due_in_7"
//   if days_until_due === 1: "due_in_1"
//   otherwise: no reminder today
//
// Edge cases:
//  - Already fully funded (remaining <= 0) but still 7/1 days out: skipped -
//    there's nothing actionable to remind the user about, even though the
//    fund isn't marked completed_at yet.
//  - Past-due funds (days_until_due < 0): never match 7 or 1, so a fund
//    that's been overdue for weeks doesn't re-fire a "due soon" reminder
//    every single day.
//  - "Due today" (days_until_due === 0): intentionally not a reminder type
//    in this v1 - the 1-day-out reminder the day before covers it. Could be
//    added as a third type later if it turns out to be wanted.
//  - Leap years: no special-casing needed - parseDateOnly builds a real
//    Date object per calendar date, so Feb 29 diffs correctly like any
//    other day.
//  - DST transitions: the local-midnight-to-local-midnight gap is 23 or 25
//    real hours (not 24) on the two days a year clocks change, which would
//    make a naive `/ MS_PER_DAY` land on 6.9583 or 7.0417 instead of 7.
//    Math.round (not floor/ceil) snaps that back to the correct whole-day
//    count, so reminders still fire exactly once, on the right day, across
//    a DST change - verified below with a worked example.
//
// @param {number} remaining - target_amount - amount_saved, clamped to >= 0
// @param {string|Date} targetDate
// @param {Date} [today] defaults to now
// @returns {'due_in_7'|'due_in_1'|null}
export function getDueSoonReminderType(remaining, targetDate, today = new Date()) {
  if (!(remaining > 0)) return null;

  const target = parseDateOnly(targetDate);
  const todayMidnight = toLocalMidnight(today);
  const daysUntilDue = Math.round((target.getTime() - todayMidnight.getTime()) / MS_PER_DAY);

  if (daysUntilDue === 7) return "due_in_7";
  if (daysUntilDue === 1) return "due_in_1";
  return null;
}

// "Underfunded" alert: fire when a fund is behind its straight-line pace
// (see calculateBehindPace in lib/calculations.js for that math), at most
// once every 7 days per fund - so a fund that's chronically behind nags
// weekly instead of daily.
//
// Formula (plain English):
//   if not behindPace.applicable or not behindPace.isBehind: don't alert
//   if never alerted before (lastSentAt is null/undefined): alert
//   days_since_last_alert = today − lastSentAt, in whole days
//   alert again only if days_since_last_alert >= 7
//
// Edge cases:
//  - Fund caught up (isBehind flips false): stops alerting immediately,
//    with no separate "snooze" state to clear - the next time it falls
//    behind again (if ever), it's treated as a fresh gap and can alert
//    right away rather than waiting out an old cooldown.
//  - calculateBehindPace itself returns { applicable: false } for a fund
//    with no usable created_at/target_date span (e.g. due date on/before
//    creation date) - this function just passes that through as "don't
//    alert," it doesn't re-derive the check.
//  - Exactly 7 days since the last alert: alerts again (>= 7, not > 7) -
//    so "weekly" means every 7 days, not every 8.
//  - DST: same Math.round day-diffing as getDueSoonReminderType above, so
//    the 7-day cooldown doesn't drift by an hour's worth of rounding error
//    across a clock change.
//
// @param {{applicable: boolean, isBehind: boolean}} behindPace - the return
//   value of calculateBehindPace()
// @param {string|Date|null} lastSentAt - when 'underfunded' was last sent
//   for this fund, or null/undefined if never
// @param {Date} [today] defaults to now
// @returns {boolean}
export function shouldSendUnderfundedAlert(behindPace, lastSentAt, today = new Date()) {
  if (!behindPace?.applicable || !behindPace?.isBehind) return false;
  if (!lastSentAt) return true;

  const todayMidnight = toLocalMidnight(today);
  const lastSentMidnight = toLocalMidnight(lastSentAt);
  const daysSinceLastSent = Math.round((todayMidnight.getTime() - lastSentMidnight.getTime()) / MS_PER_DAY);

  return daysSinceLastSent >= 7;
}
