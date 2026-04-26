/**
 * v2.13.0 — single source of truth for chart colours.
 *
 * Adam's design brief: jedna paleta v odstínech, ne omalovánky. Charts
 * default to shades of the accent green; semantic colours (success
 * trend, warning trend, danger threshold) come from a tiny fixed set.
 *
 * Brand-recognition contexts (per-pump distinct hues) intentionally
 * still use BRAND_COLORS in `stats-charts.tsx` — being able to spot
 * "Shell yellow" or "Benzina green" at a glance is a feature, not
 * noise.
 */

/** Default accent (emerald-600). Overridden at runtime by the user's
 *  accent picker, but charts intentionally pin to this base palette so
 *  the visual identity stays consistent across screens. */
export const PALETTE = {
  primary: "#059669",          // emerald-600 — main bars, lines
  primaryStrong: "#047857",    // emerald-700 — hover, emphasised series
  primarySoft: "#10B981",      // emerald-500 — secondary series
  primaryFaint: "#A7F3D0",     // emerald-200 — area fills, gridlines
  ink: "#0F172A",              // slate-900 — heavy bars in dark contexts
  inkSoft: "#475569",          // slate-600 — secondary lines
  good: "#16A34A",             // green-600 — positive deltas
  warn: "#F59E0B",             // amber-500 — caution highlights
  danger: "#DC2626",           // red-600 — negative deltas, threshold lines
  grid: "#E2E8F0",             // slate-200 — light grid
  gridDark: "#334155",         // slate-700 — dark-mode grid
} as const;

/** Ordered shades of the accent for stacked / multi-series charts.
 *  First element is darkest (top in a stack). */
export const ACCENT_SHADES = [
  "#047857", // emerald-700
  "#059669", // emerald-600
  "#10B981", // emerald-500
  "#34D399", // emerald-400
  "#6EE7B7", // emerald-300
  "#A7F3D0", // emerald-200
] as const;
