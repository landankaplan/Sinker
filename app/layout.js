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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-cream-50 text-ink">
        {children}
        <Footer />
        <ServiceWorkerRegister />
        <InstallTracking />
        <Analytics />
      </body>
    </html>
  );
}
