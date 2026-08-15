import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Sinker",
  description: "Save the right amount, every paycheck, for the bills you know are coming.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream-50 text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
