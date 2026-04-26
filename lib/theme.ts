/**
 * v2.11.0 — user-pickable accent colour.
 *
 * Persisted in localStorage so it survives reloads but never leaves the
 * device — no DB write, no server round-trip. The chosen colour is
 * applied to the document by setting CSS custom properties:
 *
 *   --accent          → primary action colour (buttons, links)
 *   --accent-hover    → darker shade for hover states
 *   --accent-soft     → translucent tint used for chip / badge bgs
 *
 * Tailwind classes that already use `bg-accent` / `text-accent` /
 * `border-accent` pick this up automatically (see globals.css).
 */

export type AccentPreset = {
  id: string;
  label: string;
  /** Solid CSS colour for the swatch + --accent var. */
  swatch: string;
  hover: string;
  soft: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "sky",     label: "Modrá",       swatch: "#0284c7", hover: "#0369a1", soft: "rgba(2,132,199,0.12)" },
  { id: "indigo",  label: "Indigo",      swatch: "#4f46e5", hover: "#4338ca", soft: "rgba(79,70,229,0.12)" },
  { id: "violet",  label: "Fialová",     swatch: "#7c3aed", hover: "#6d28d9", soft: "rgba(124,58,237,0.12)" },
  { id: "rose",    label: "Růžová",      swatch: "#e11d48", hover: "#be123c", soft: "rgba(225,29,72,0.12)" },
  { id: "amber",   label: "Oranžová",    swatch: "#d97706", hover: "#b45309", soft: "rgba(217,119,6,0.12)" },
  { id: "emerald", label: "Zelená",      swatch: "#059669", hover: "#047857", soft: "rgba(5,150,105,0.12)" },
  { id: "slate",   label: "Tmavě šedá",  swatch: "#475569", hover: "#334155", soft: "rgba(71,85,105,0.12)" },
];

const STORAGE_KEY = "fuellog-accent";
const DEFAULT_ID = "sky";

export function loadAccent(): AccentPreset {
  if (typeof window === "undefined") return ACCENT_PRESETS[0];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const found = stored ? ACCENT_PRESETS.find((p) => p.id === stored) : null;
    return found ?? ACCENT_PRESETS.find((p) => p.id === DEFAULT_ID)!;
  } catch {
    return ACCENT_PRESETS[0];
  }
}

export function applyAccent(preset: AccentPreset): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent", preset.swatch);
  root.style.setProperty("--accent-hover", preset.hover);
  root.style.setProperty("--accent-soft", preset.soft);
  try {
    window.localStorage.setItem(STORAGE_KEY, preset.id);
  } catch {
    /* private mode etc. — best effort */
  }
}
