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

-- One row per contribution event (append-only log, not editable/deletable
-- via the app). Powers the behind-pace insight and, later, streaks and
-- rate-based shortfall projections - none of which are computable from a
-- single running total.
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

drop policy if exists "insert own contributions" on public.fund_contributions;
create policy "insert own contributions" on public.fund_contributions
  for insert with check (auth.uid() = user_id);
