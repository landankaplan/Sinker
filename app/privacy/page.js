import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - StayAhead",
};

// Plain-language privacy policy. Every claim here matches what the code
// actually does (see supabase/schema.sql for RLS, lib/email.js for Resend,
// components/InstallTracking.js for the only analytics events sent) - kept
// that way on purpose, not written pretending to features/permissions the
// app doesn't have.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-ink">
      <Link href="/" className="text-coral-600 hover:underline">
        ← Back to StayAhead
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ink">Privacy Policy</h1>
      <p className="mt-1 text-xs text-ink-muted">Last updated August 2026</p>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">What we collect</h2>
        <p className="mt-2">
          StayAhead only stores what you type in yourself: your email address (for logging in), the funds
          you create (name, target amount, due date), how much you've logged toward each one and when, and
          how often you get paid. There's no automatic tracking of anything else about you.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">No bank connections</h2>
        <p className="mt-2">
          StayAhead never connects to your bank account or card. Every dollar amount is typed in by hand.
          We have no access to, and never ask for, your actual bank login, account numbers, or balances.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">How your data is stored</h2>
        <p className="mt-2">
          Your data lives in a Postgres database hosted by Supabase, protected by row-level security rules
          that make it technically impossible for one user's account to read another's data — even through
          a bug, the database itself enforces the boundary.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Email</h2>
        <p className="mt-2">
          If you turn on email reminders in Settings, we use a service called Resend to send you due-date
          and behind-pace reminder emails. Your email address is used only to let you log in and, if
          enabled, to send you these reminders — never for marketing, and never sold or shared with anyone
          else.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Analytics</h2>
        <p className="mt-2">
          We use Vercel Analytics to see anonymous, aggregate usage (like how many people install the app
          to their home screen). This doesn't identify you personally and isn't used for advertising.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Deleting your data</h2>
        <p className="mt-2">
          You can delete individual funds yourself at any time from the dashboard. To delete your entire
          account and all associated data, contact us using the email below.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Children's privacy</h2>
        <p className="mt-2">
          StayAhead is not directed at children under 13, and we don't knowingly collect information from
          anyone under 13. If you believe a child has created an account, contact us and we'll remove it.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Changes to this policy</h2>
        <p className="mt-2">
          If this policy changes in a meaningful way, we'll update the date at the top of this page.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Contact</h2>
        <p className="mt-2">
          Questions about your data? Reach out at{" "}
          <a href="mailto:hello@stayahead.app" className="text-coral-600 hover:underline">
            hello@stayahead.app
          </a>
          .
        </p>
      </section>
    </main>
  );
}
