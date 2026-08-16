"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/calculations";

// Horizontal bar chart comparing "amount saved" across active funds - a
// single measure across categories (fund names), not multiple series, so
// per the dataviz skill this stays one hue throughout (color would only
// need to vary per-bar if each bar were its own series being compared
// against a matching legend, which isn't the case here) and needs no
// legend box. Bars are capped at 16px thick (under the skill's 24px cap),
// square at the baseline (left) and rounded at the data end (right) via
// CSS corner radii rather than SVG paths, with the value label riding the
// tip of each bar per the skill's "bars -> value at the tip" rule.
export default function FundsBarChart({ bars }) {
  const [hovered, setHovered] = useState(null);

  if (!bars || bars.length === 0) return null;

  const maxValue = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {bars.map((bar, i) => {
        const pct = Math.max(0, Math.min(100, (bar.value / maxValue) * 100));
        return (
          <div
            // Keyed by id, not label - fund names aren't unique (no DB
            // constraint enforces it), so two same-named funds would
            // otherwise collide on a label-based key.
            key={bar.id ?? bar.label}
            className={`flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors ${
              hovered === i ? "bg-black/[0.03] dark:bg-white/[0.05]" : "bg-transparent"
            }`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="w-24 shrink-0 truncate text-xs text-ink-muted dark:text-ink-300 sm:w-32"
              title={bar.label}
            >
              {bar.label}
            </span>
            <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-cream-100 dark:bg-ink-800">
              <div
                className="h-4 rounded-r-[4px] bg-coral-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-medium text-ink dark:text-cream-50">
              {formatCurrency(bar.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
