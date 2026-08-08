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
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="font-semibold text-slate-900">Sinker</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-1 text-sm font-medium sm:px-3 sm:py-1.5 ${
                  pathname === link.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
