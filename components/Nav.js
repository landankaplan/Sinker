"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Funds" },
  { href: "/calendar", label: "Calendar" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white shadow-sm dark:bg-ink-900">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="font-bold text-coral-600">StayAhead</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-1 text-sm font-medium transition-colors sm:px-3 sm:py-1.5 ${
                  pathname === link.href
                    ? "bg-coral-600 text-white"
                    : "text-ink-muted hover:bg-cream-100 dark:text-ink-300 dark:hover:bg-ink-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-300 dark:hover:text-cream-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
