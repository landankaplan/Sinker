"use client";

import { useEffect, useMemo, useState } from "react";

const CONFETTI_COLORS = ["#d95926", "#eb6834", "#fdf9f5", "#22c55e", "#f59e0b"];

// Lightweight celebration overlay for a fund crossing 100% funded - plain
// CSS animation (see the confetti-fall keyframe in app/globals.css), no
// canvas or new dependency. Auto-dismisses after a few seconds, or on
// click/tap anywhere, or Escape - never traps the user on the overlay.
export default function MilestoneCelebration({ fundName, onDismiss }) {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.2,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3200);
    function handleKey(e) {
      if (e.key === "Escape") setVisible(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      const cleanup = setTimeout(() => onDismiss?.(), 200);
      return () => clearTimeout(cleanup);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[1px]"
      onClick={() => setVisible(false)}
      role="dialog"
      aria-live="polite"
      aria-label={`${fundName} is fully funded`}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 block rounded-sm"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s 1 forwards`,
            }}
          />
        ))}
      </div>

      <div
        className="relative mx-4 max-w-xs rounded-2xl bg-white p-6 text-center shadow-lg dark:border dark:border-ink-800 dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-4xl">🎉</p>
        <p className="mt-2 text-lg font-bold text-ink dark:text-cream-50">Fully funded!</p>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-300">
          <span className="font-semibold text-ink dark:text-cream-50">{fundName}</span> just hit its goal.
        </p>
        <button
          onClick={() => setVisible(false)}
          className="mt-4 rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700"
        >
          Nice
        </button>
      </div>
    </div>
  );
}
