"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/calculations";

// Total-saved-over-time chart. Single series -> sequential/one-hue by the
// dataviz method (see the skill's choosing-a-form.md): a line + a light
// area wash in the app's own brand coral, no legend (a single color needs
// no swatch to explain it - the caption above the chart already says what
// it is). Hand-rolled SVG rather than a charting library, to avoid adding
// a new dependency for one chart.
//
// `points`: [{ dateLabel: 'Aug 15', total: 245.5 }, ...] - pre-formatted,
// evenly-spaced (one per day) server-side by lib/insights.js's
// buildCumulativeSavingsSeries, so this component only has to lay them out
// and draw - no date math here.
const WIDTH = 700;
const HEIGHT = 200;
const PAD_TOP = 28;
const PAD_BOTTOM = 26;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;

export default function SavingsChart({ points }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const { path, areaPath, xFor, yFor, maxTotal, gridLines } = useMemo(() => {
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const totals = points.map((p) => p.total);
    const rawMax = Math.max(...totals, 0);
    // A little headroom above the highest point so the line/end-label never
    // touch the top edge; a flat-zero series still gets a usable (non-zero)
    // scale instead of dividing by zero.
    const max = rawMax > 0 ? rawMax * 1.15 : 10;

    const xFor = (i) => PAD_LEFT + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotWidth);
    const yFor = (total) => PAD_TOP + plotHeight - (total / max) * plotHeight;

    const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.total)}`).join(" L ");
    const path = points.length > 0 ? `M ${linePoints}` : "";

    const areaPath =
      points.length > 0
        ? `M ${xFor(0)},${yFor(0)} L ${linePoints} L ${xFor(points.length - 1)},${yFor(0)} Z`
        : "";

    // Three recessive reference lines (0%, 50%, 100% of the scale) - hairline
    // gridlines per the dataviz mark spec, never dashed.
    const gridLines = [0, 0.5, 1].map((frac) => PAD_TOP + plotHeight * (1 - frac));

    return { path, areaPath, xFor, yFor, maxTotal: max, gridLines };
  }, [points]);

  if (!points || points.length === 0) return null;

  const lastIndex = points.length - 1;
  const lastPoint = points[lastIndex];

  // Sparse x-axis labels: first, middle, last only - "label selectively,
  // never a number on every point."
  const labelIndexes = new Set([0, Math.floor(lastIndex / 2), lastIndex]);

  function handlePointerMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const fraction = Math.max(0, Math.min(1, (x - PAD_LEFT) / plotWidth));
    const index = Math.round(fraction * lastIndex);
    setHoverIndex(index);
  }

  const active = hoverIndex !== null ? points[hoverIndex] : lastPoint;
  const activeIndex = hoverIndex !== null ? hoverIndex : lastIndex;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-300">Total saved, last 90 days</p>
        <p className="text-sm font-semibold text-coral-600">{formatCurrency(active.total)}</p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full touch-none"
        role="img"
        aria-label={`Total saved over the last 90 days, currently ${formatCurrency(lastPoint.total)}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={y}
            y2={y}
            className="stroke-cream-100 dark:stroke-ink-800"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} className="fill-coral-600" fillOpacity="0.1" stroke="none" />
        <path
          d={path}
          fill="none"
          className="stroke-coral-600"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* End marker: the mark spec's >=8px dot with a surface ring so it
            stays legible where it meets the line. The ring matches this
            chart's own card background (white in light mode, ink-900 in
            dark), not the page background, so it reads as a gap rather
            than a mismatched dot. */}
        <circle cx={xFor(lastIndex)} cy={yFor(lastPoint.total)} r="6" className="fill-white dark:fill-ink-900" />
        <circle cx={xFor(lastIndex)} cy={yFor(lastPoint.total)} r="4" className="fill-coral-600" />

        {/* Crosshair + hover marker - the dataviz default hover layer. */}
        {hoverIndex !== null && (
          <>
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              className="stroke-[#c3c2b7] dark:stroke-ink-300"
              strokeWidth="1"
            />
            <circle
              cx={xFor(hoverIndex)}
              cy={yFor(points[hoverIndex].total)}
              r="6"
              className="fill-white dark:fill-ink-900"
            />
            <circle cx={xFor(hoverIndex)} cy={yFor(points[hoverIndex].total)} r="4" className="fill-coral-600" />
          </>
        )}

        {/* Value at the line's end, per the mark spec ("Lines -> value at the end"). */}
        <text
          x={xFor(lastIndex) - 4}
          y={PAD_TOP - 12}
          textAnchor="end"
          fontSize="11"
          fontWeight="600"
          className="fill-ink dark:fill-cream-50"
        >
          {formatCurrency(lastPoint.total)}
        </text>

        {points.map((p, i) =>
          labelIndexes.has(i) ? (
            <text
              key={i}
              x={i === 0 ? xFor(i) : i === lastIndex ? xFor(i) : xFor(i)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === lastIndex ? "end" : "middle"}
              fontSize="10"
              className="fill-ink-muted dark:fill-ink-300"
            >
              {p.dateLabel}
            </text>
          ) : null
        )}
      </svg>

      {hoverIndex !== null && (
        <p className="text-center text-[11px] text-ink-muted dark:text-ink-300">
          {points[activeIndex].dateLabel}:{" "}
          <span className="font-semibold text-ink dark:text-cream-50">{formatCurrency(points[activeIndex].total)}</span>
        </p>
      )}
    </div>
  );
}
