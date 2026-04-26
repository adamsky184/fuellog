"use client";

/**
 * v2.12.0 — generic SVG choropleth + side panel.
 *
 * Replaces the v2.11.0 tile grid with real (simplified) geographic
 * outlines. Inspired by the Skoda CCD reference Adam shared:
 *   - Map on the left, regions coloured by intensity
 *   - Sortable list of regions on the right with value + share
 *   - Highlights the top region; tooltips on hover
 *
 * Path data + label coordinates come from `lib/geo/*`.
 */

import { useMemo, useState } from "react";

export type GeoShape = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};

type Props = {
  title: string;
  /** SVG viewBox the shapes are drawn in. */
  viewBox: string;
  shapes: GeoShape[];
  /** Region code → numeric value (litres / Kč / count). */
  data: Map<string, number>;
  /** Unit suffix shown in the side list. */
  unit?: string;
  /** Number formatter; defaults to Czech locale, 1 decimal. */
  format?: (n: number) => string;
  /** Optional emoji-flag prefix for the side list (e.g. for Europe). */
  flagFor?: (code: string) => string | null;
  /** Render the inline label inside each shape (kraj abbreviations look ok;
   *  tiny Praha districts work too). Defaults true. */
  showLabels?: boolean;
};

export function GeoMap({
  title,
  viewBox,
  shapes,
  data,
  unit = "l",
  format,
  flagFor,
  showLabels = true,
}: Props) {
  const fmt = format ?? ((n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 }));
  const values = Array.from(data.values()).filter((v) => v > 0);
  const max = values.length > 0 ? Math.max(...values) : 1;
  const total = values.reduce((a, b) => a + b, 0);

  const [hovered, setHovered] = useState<string | null>(null);

  const ranked = useMemo(() => {
    return shapes
      .map((s) => ({ ...s, value: data.get(s.code) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [shapes, data]);

  function intensity(v: number): number {
    return max > 0 ? v / max : 0;
  }
  function fillFor(v: number): string {
    if (v <= 0) return "rgb(241 245 249)"; // slate-100
    const pct = Math.max(15, Math.round(intensity(v) * 90));
    return `color-mix(in oklab, rgb(var(--accent-rgb)) ${pct}%, white)`;
  }
  function strokeFor(v: number, isHovered: boolean): string {
    if (isHovered) return "rgb(var(--accent-rgb))";
    if (v <= 0) return "rgb(203 213 225)"; // slate-300
    return "white";
  }

  if (total === 0) return null;

  // Local helper so the SVG render block (with its two-pass z-order)
  // stays readable. Defined here, after `fillFor` / `strokeFor` /
  // `intensity` close over component scope.
  function renderShape(
    s: GeoShape,
    dataMap: Map<string, number>,
    fmt: (n: number) => string,
    unit: string,
    fillFor: (v: number) => string,
    strokeFor: (v: number, hovered: boolean) => string,
    intensity: (v: number) => number,
    isHovered: boolean,
    showLabels: boolean,
    setHovered: (code: string | null) => void,
  ) {
    const v = dataMap.get(s.code) ?? 0;
    return (
      <g
        key={s.code}
        onMouseEnter={() => setHovered(s.code)}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: "pointer" }}
      >
        <title>
          {s.label}
          {v > 0 ? ` — ${fmt(v)} ${unit}` : ""}
        </title>
        <path
          d={s.d}
          fill={fillFor(v)}
          stroke={strokeFor(v, isHovered)}
          strokeWidth={isHovered ? 2.5 : 1.5}
          strokeLinejoin="round"
        />
        {showLabels && (
          <text
            x={s.centroid[0]}
            y={s.centroid[1]}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: "none" }}
            className={`text-[18px] font-semibold ${
              intensity(v) > 0.5 ? "fill-white" : "fill-slate-700 dark:fill-slate-300"
            }`}
          >
            {s.code === "P" ? "" : s.code}
          </text>
        )}
      </g>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <span className="text-xs text-slate-400 tabular-nums">
          celkem {fmt(total)} {unit}
        </span>
      </div>
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
          <svg
            viewBox={viewBox}
            className="w-full h-auto"
            role="img"
            aria-label={title}
          >
            {/* v2.14.1 — render shapes in two passes:
                  1) all non-hovered (z-order = original)
                  2) the hovered one ON TOP, so its accent border draws
                     fully even where it's adjacent to another shape's
                     stroke. Fixes Adam's "only some borders highlight"
                     report on neighbouring kraje / countries. */}
            {shapes
              .filter((s) => s.code !== hovered)
              .map((s) => renderShape(s, data, fmt, unit, fillFor, strokeFor, intensity, false, showLabels, setHovered))}
            {hovered &&
              shapes
                .filter((s) => s.code === hovered)
                .map((s) => renderShape(s, data, fmt, unit, fillFor, strokeFor, intensity, true, showLabels, setHovered))}
          </svg>
        </div>

        {/* v2.14.4 — side panel renders ALL regions in a scrollable
              column. Adam: "u Mapa tankování je '… a dalších 2', dej
              tam decentní posuvník". Max-height matches the SVG so the
              two columns line up; thin custom scrollbar. */}
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          {ranked.map((r, i) => {
            const share = total > 0 ? r.value / total : 0;
            const isTop = i === 0 && r.value > 0;
            const isHover = hovered === r.code;
            const flag = flagFor?.(r.code) ?? null;
            return (
              <button
                key={r.code}
                type="button"
                onMouseEnter={() => setHovered(r.code)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full text-left rounded-md px-2 py-1.5 transition border ${
                  isHover
                    ? "border-accent bg-accent/10"
                    : isTop
                      ? "border-transparent bg-accent/5"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                } ${r.value === 0 ? "opacity-50" : ""}`}
              >
                <div className="flex items-baseline gap-2">
                  {flag && <span className="text-base shrink-0">{flag}</span>}
                  <span className="text-xs font-medium truncate flex-1">{r.label}</span>
                  <span className="text-xs tabular-nums text-slate-700 dark:text-slate-200">
                    {r.value > 0 ? fmt(r.value) : "—"}
                  </span>
                </div>
                {r.value > 0 && (
                  <div className="mt-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(2, Math.round(share * 100))}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
