import "./globals.css";

export const metadata = {
  title: "Sinker",
  description: "Save the right amount, every paycheck, for the bills you know are coming.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
