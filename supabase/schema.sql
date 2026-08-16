-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- before using the app for the first time.

create extension if not exists "pgcrypto";

-- One row per user: their paycheck frequency
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paycheck_frequency text not null default 'monthly'
    check (paycheck_frequency in ('weekly', 'biweekly', 'monthly')),
  updated_at timestamptz not null default now()
);

-- One row per sinking fund
create table if not exists public.sinking_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  target_date date not null,
  created_at timestamptz not null default now()
);

-- Progress tracking + completion (added for the progress bar / completed-fund features).
-- Safe to run even if sinking_funds already existed without these columns.
alter table public.sinking_funds
  add column if not exists amount_saved numeric(12, 2) not null default 0;

alter table public.sinking_funds
  add column if not exists completed_at timestamptz;

alter table public.sinking_funds
  drop constraint if exists sinking_funds_amount_saved_check;
alter table public.sinking_funds
  add constraint sinking_funds_amount_saved_check check (amount_saved >= 0);

create index if not exists sinking_funds_user_id_idx on public.sinking_funds(user_id);
create index if not exists sinking_funds_target_date_idx on public.sinking_funds(target_date);

-- Row Level Security: every user can only ever see/touch their own rows
alter table public.user_settings enable row level security;
alter table public.sinking_funds enable row level security;

drop policy if exists "select own settings" on public.user_settings;
create policy "select own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "insert own settings" on public.user_settings;
create policy "insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own settings" on public.user_settings;
create policy "update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

drop policy if exists "select own funds" on public.sinking_funds;
create policy "select own funds" on public.sinking_funds
  for select using (auth.uid() = user_id);

drop policy if exists "insert own funds" on public.sinking_funds;
create policy "insert own funds" on public.sinking_funds
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own funds" on public.sinking_funds;
create policy "update own funds" on public.sinking_funds
  for update using (auth.uid() = user_id);

drop policy if exists "delete own funds" on public.sinking_funds;
create policy "delete own funds" on public.sinking_funds
  for delete using (auth.uid() = user_id);

-- One row per contribution event. Powers the behind-pace insight, streaks,
-- rate-based shortfall projections, and the Insights tab - none of which
-- are computable from a single running total. Originally append-only from
-- the app's point of view; the contribution-history "fix a mistake" flow
-- (see the delete policy further down, and
-- app/api/funds/[id]/contributions/[contributionId]/route.js) later added
-- the ability to remove a single mistaken entry.
create table if not exists public.fund_contributions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.sinking_funds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  contributed_at timestamptz not null default now()
);

create index if not exists fund_contributions_fund_id_idx on public.fund_contributions(fund_id);
create index if not exists fund_contributions_user_id_idx on public.fund_contributions(user_id);

alter table public.fund_contributions enable row level security;

drop policy if exists "select own contributions" on public.fund_contributions;
create policy "select own contributions" on public.fund_contributions
  for select using (auth.uid() = user_id);

-- Checks BOTH that the row's user_id is the caller AND that fund_id
-- actually points to a fund that same caller owns - without the second
-- check, a signed-in user could (by calling Supabase directly, not through
-- the app's own /api routes) insert a contribution row that references
-- someone else's fund id. Harmless today (nothing currently reads
-- fund_contributions across users), but a real gap in what the database
-- itself enforces, which is the whole point of RLS.
drop policy if exists "insert own contributions" on public.fund_contributions;
create policy "insert own contributions" on public.fund_contributions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.sinking_funds
      where sinking_funds.id = fund_contributions.fund_id
        and sinking_funds.user_id = auth.uid()
    )
  );

-- Lets a user delete their own logged contributions - powers the
-- "fix a mistake" flow in components/ContributionHistory.js (see
-- app/api/funds/[id]/contributions/[contributionId]/route.js). Without this
-- policy, RLS silently blocks every delete (0 rows affected, no error
-- returned), which would make that route's DELETE call a no-op that still
-- reports success and still decrements the fund's amount_saved as if the
-- row were actually gone - a real, previously-missing policy, not just a
-- defensive extra.
drop policy if exists "delete own contributions" on public.fund_contributions;
create policy "delete own contributions" on public.fund_contributions
  for delete using (auth.uid() = user_id);

-- Email notifications: whether this user wants due-date reminders and
-- underfunded-goal alerts at all. Defaults to true (opt-out, not opt-in) so
-- the feature is actually experienced by default once it's configured -
-- see the Settings page for the toggle to turn it off.
alter table public.user_settings
  add column if not exists email_notifications_enabled boolean not null default true;

-- Idempotency log for the notifications cron job (app/api/cron/notifications).
-- One row per notification actually sent. The cron route checks this table
-- before sending so a fund never gets the same "due in 7 days" reminder
-- twice, and "underfunded" alerts are spaced out (see
-- lib/notifications.js's shouldSendUnderfundedAlert) rather than firing
-- every single day a fund stays behind pace.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_id uuid not null references public.sinking_funds(id) on delete cascade,
  notification_type text not null check (notification_type in ('due_in_7', 'due_in_1', 'underfunded')),
  sent_at timestamptz not null default now()
);

-- Widen the allowed notification types to include 'inactivity' (the "gone
-- quiet" nudge - see lib/notifications.js's shouldSendInactivityNudge).
-- Safe to re-run: drops and re-adds the same auto-named check constraint
-- Postgres created for the inline `check` above.
alter table public.notification_log
  drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log
  add constraint notification_log_notification_type_check
  check (notification_type in ('due_in_7', 'due_in_1', 'underfunded', 'inactivity'));

create index if not exists notification_log_fund_type_idx on public.notification_log(fund_id, notification_type);

-- This table is only ever written by the cron route using the service-role
-- key (see lib/supabase/admin.js), which bypasses RLS entirely - so no
-- insert/update/delete policy is needed for regular users. The select
-- policy just lets a signed-in user see their own notification history if
-- a "notifications sent" view ever gets built later; it isn't used yet.
alter table public.notification_log enable row level security;

drop policy if exists "select own notification log" on public.notification_log;
create policy "select own notification log" on public.notification_log
  for select using (auth.uid() = user_id);

-- Lightweight, self-hosted error log for real-user crashes - a free
-- alternative to a third-party error-tracking service. Written only by
-- app/api/log-error/route.js using the service-role admin client (bypasses
-- RLS), and only ever read directly in the Supabase dashboard's table
-- editor - no in-app UI exposes this to users, so no select policy is
-- needed for regular users either.
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  url text,
  created_at timestamptz not null default now()
);

create index if not exists error_log_created_at_idx on public.error_log(created_at);

alter table public.error_log enable row level security;

-- Deleting a fund used to cascade-delete every contribution ever logged
-- against it ("on delete cascade" above), which quietly wiped that money
-- out of lifetime stats too - the Insights tab's "Saved all-time" number
-- would drop the moment you deleted an old fund, even though you genuinely
-- saved that money at some point. That's surprising: deleting a fund
-- should remove it from your active list, not erase the history of what
-- you actually saved.
--
-- Switching to "on delete set null" keeps the contribution rows (and the
-- money they represent) after their fund is gone - they just become
-- unowned by any specific fund. Insights' lifetime totals (which query by
-- user_id only, not fund_id) keep counting them; anything that looks up
-- contributions BY fund_id (the per-fund history panel, the CSV export)
-- naturally stops showing them, since there's no fund left to attach them
-- to - which is the correct behavior for those.
--
-- This only changes behavior for FUTURE fund deletions. Contributions
-- belonging to funds already deleted before this migration ran were
-- already cascade-deleted and can't be recovered - there's no copy of
-- that data left anywhere to restore from.
alter table public.fund_contributions
  drop constraint if exists fund_contributions_fund_id_fkey;
alter table public.fund_contributions
  alter column fund_id drop not null;
alter table public.fund_contributions
  add constraint fund_contributions_fund_id_fkey
  foreign key (fund_id) references public.sinking_funds(id) on delete set null;
