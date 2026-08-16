import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto py-6 text-center text-xs text-ink-muted dark:text-ink-300">
      <Link href="/privacy" className="hover:text-ink hover:underline dark:hover:text-cream-50">
        Privacy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms" className="hover:text-ink hover:underline dark:hover:text-cream-50">
        Terms
      </Link>
    </footer>
  );
}
