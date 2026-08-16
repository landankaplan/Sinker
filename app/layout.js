import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallTracking from "@/components/InstallTracking";
import Footer from "@/components/Footer";

export const metadata = {
  title: "StayAhead",
  description: "Save the right amount, every paycheck, for the bills you know are coming.",
  // Next.js auto-generates this at /manifest.webmanifest from app/manifest.js -
  // this just points the browser at it so it knows the site is installable.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "StayAhead",
    // "default" gives a plain white iOS status bar; matches the app's light
    // cream background better than the black/translucent alternatives.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// Split out from `metadata` per Next.js 14's viewport/themeColor convention
// (putting themeColor inside `metadata` is deprecated as of 14).
export const viewport = {
  themeColor: "#d95926",
  width: "device-width",
  initialScale: 1,
};

// Runs before Next.js hydrates anything (a plain synchronous inline script
// in <head>, not a React effect) so the `dark` class lands on <html> before
// the first paint - a `useEffect` in a React component would only run
// AFTER that first paint, producing a visible light-then-dark flash on
// every load for someone who prefers dark mode. Preference order: an
// explicit choice saved by components/ThemeToggle.js (localStorage
// "theme": "light" | "dark") wins if present; otherwise fall back to the
// OS-level prefers-color-scheme, so a first-time visitor with dark mode
// set system-wide sees a dark app immediately, without having to find and
// click a toggle first. Wrapped in try/catch because localStorage can
// throw in some locked-down browser contexts (private browsing quirks,
// disabled storage) - a failure here should silently fall back to light,
// never break the page.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col bg-cream-50 text-ink dark:bg-ink-950 dark:text-cream-50">
        {children}
        <Footer />
        <ServiceWorkerRegister />
        <InstallTracking />
        <Analytics />
      </body>
    </html>
  );
}
