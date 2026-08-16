// Next.js's route-level loading UI - shown automatically while this route
// segment's data is being fetched (e.g. navigating back to the dashboard).
// A shape-matched skeleton reads as "still loading" rather than a blank
// flash or a layout jump once the real content arrives.
function Block({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-cream-100 dark:bg-ink-800 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Block className="h-6 w-32" />
        <Block className="h-5 w-40" />
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
        <Block className="h-3 w-40" />
        <Block className="mt-2 h-7 w-28" />
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
            <Block className="h-4 w-40" />
            <Block className="mt-2 h-3 w-56" />
            <Block className="mt-3 h-2 w-full max-w-xs" />
          </div>
        ))}
      </div>
    </main>
  );
}
