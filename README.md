# StayAhead

Track known future expenses (bills, goals — the finance term for this is a
"sinking fund") — like car insurance or an annual subscription — and see
exactly how much to set aside per paycheck to hit each one on time. Built
with Next.js (App Router, API routes) and Supabase (Postgres + Auth).

## Features

- Email/password accounts via Supabase Auth, with a show/hide toggle on password fields
- Create, edit, and delete funds: name, target amount, target date
- Log contributions per fund and see a progress bar toward the target
- Funds auto-complete (and move to a "Completed" section) once fully funded,
  or you can mark/reopen one manually
- A "total needed this month" summary across all active funds
- Automatic per-paycheck savings calculation based on your paycheck frequency
  (weekly / biweekly / monthly), set once in Settings
- Calendar view of upcoming (and past) due dates, navigable month by month
- Manual entry only — no bank account linking

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up the database**

   In your Supabase project dashboard, open the SQL Editor and run the
   contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates
   the `sinking_funds` and `user_settings` tables with row-level security so
   each user can only see their own data. The `alter table` statements in
   there are safe to re-run even if the tables already exist — that's how
   the `amount_saved` / `completed_at` columns get added to an existing
   database.

3. **Environment variables**

   Copy `.env.local.example` to `.env.local` and fill in your Supabase
   project's URL, publishable key, and secret key (Project Settings → API in
   the Supabase dashboard).

   ```bash
   cp .env.local.example .env.local
   ```

4. **Run it**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000, sign up, confirm your email (check your
   inbox — or disable email confirmation in Supabase's Auth settings for
   faster local testing), then log in and add your first fund.

## Deploying

Push this repo to GitHub and import it into Vercel (vercel.com → Add New
Project). Add the same three environment variables from `.env.local` in the
Vercel project settings, and every push to `main` will auto-deploy.

## Project structure

```
app/
  page.js              Dashboard - list + add funds
  calendar/page.js     Month-navigable calendar of due dates
  settings/page.js     Set paycheck frequency
  login/, signup/       Auth pages
  api/funds/            GET/POST funds
  api/funds/[id]/        PUT/DELETE a single fund
  api/settings/          GET/POST paycheck frequency
lib/
  calculations.js      Per-paycheck math
  supabase/            Browser/server Supabase clients + session middleware
components/            UI components
supabase/schema.sql    Database schema + RLS policies
```
