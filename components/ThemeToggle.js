"use client";

import { useEffect, useState } from "react";

// Reads the CURRENT state from the DOM (whether app/layout.js's inline
// script already put the `dark` class on <html>) rather than defaulting to
// "light" - so this button's icon matches reality on first render instead
// of flashing from the wrong icon to the right one. Only runs client-side
// (useEffect) since document isn't available during server rendering; the
// brief undefined state before that effect renders nothing; the icon
// button underneath is invisible for a frame rather than showing a wrong
// icon.
export default function ThemeToggle({ className = "" }) {
  const [isDark, setIsDark] = useState(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {
      // Storage can be unavailable (private browsing, disabled storage) -
      // the toggle still works for this page load, it just won't persist
      // across a reload. Not worth surfacing as an error to the user.
    }
  }

  if (isDark === null) {
    return <span className={`inline-block h-8 w-8 ${className}`} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-cream-100 dark:text-ink-300 dark:hover:bg-ink-800 ${className}`}
    >
      {isDark ? (
        <span aria-hidden="true">☀️</span>
      ) : (
        <span aria-hidden="true">🌙</span>
      )}
    </button>
  );
}
