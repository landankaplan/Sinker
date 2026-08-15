"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Funds" },
  { href: "/calendar", label: "Calendar" },
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
    <nav className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="font-bold text-coral-600">Sinker</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-1 text-sm font-medium sm:px-3 sm:py-1.5 ${
                  pathname === link.href
                    ? "bg-coral-600 text-white"
                    : "text-ink-muted hover:bg-cream-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-ink-muted hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
