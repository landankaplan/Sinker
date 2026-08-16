import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto py-6 text-center text-xs text-ink-muted">
      <Link href="/privacy" className="hover:text-ink hover:underline">
        Privacy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms" className="hover:text-ink hover:underline">
        Terms
      </Link>
    </footer>
  );
}
