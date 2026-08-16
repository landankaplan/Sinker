import Link from "next/link";

export const metadata = {
  title: "Terms of Service - StayAhead",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-ink">
      <Link href="/" className="text-coral-600 hover:underline">
        ← Back to StayAhead
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ink">Terms of Service</h1>
      <p className="mt-1 text-xs text-ink-muted">Last updated August 2026</p>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">What StayAhead is</h2>
        <p className="mt-2">
          StayAhead is a planning tool that helps you figure out how much to set aside per paycheck for
          bills and goals you know are coming. It's a calculator and tracker for money you enter yourself —
          it doesn't move, hold, or have access to any of your real money.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Not financial advice</h2>
        <p className="mt-2">
          StayAhead performs math based on the numbers you type in — it doesn't know your full financial
          picture and isn't a substitute for advice from a qualified financial professional. Decisions
          about your money are yours to make.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Your responsibilities</h2>
        <p className="mt-2">
          Keep your login credentials to yourself, enter accurate information, and use the app for its
          intended purpose — personal budgeting and saving. Don't try to break, abuse, or interfere with
          the service.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">No guarantees</h2>
        <p className="mt-2">
          StayAhead is provided "as is," without warranties of any kind. We work to keep the math correct
          and the app running smoothly, but we can't guarantee it will be error-free or available at all
          times, and we aren't liable for decisions made based on its calculations.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Changes</h2>
        <p className="mt-2">
          We may update these terms or the app itself over time. Continuing to use StayAhead after a change
          means you accept the updated terms.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Contact</h2>
        <p className="mt-2">
          Questions about these terms? Reach out at{" "}
          <a href="mailto:hello@stayahead.app" className="text-coral-600 hover:underline">
            hello@stayahead.app
          </a>
          .
        </p>
      </section>
    </main>
  );
}
