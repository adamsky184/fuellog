"use client";

/**
 * v2.14.1 — runtime accent → chart palette hook.
 *
 * Recharts SVG attributes (fill, stroke) cannot resolve `var(--accent)`
 * (CSS variables only work in the `style` attribute, not in SVG
 * presentation attributes). Workaround: read the actual --accent-rgb
 * triplet from `getComputedStyle` at mount time, derive lighter /
 * darker shades, and feed them into chart components as plain rgb()
 * strings.
 *
 * Re-runs when localStorage updates (the AccentToggle dispatches a
 * `storage` event when on a different tab, plus we listen to a custom
 * 'fuellog:accent-changed' event for the same-tab case).
 */

import { useEffect, useState } from "react";
import { PALETTE as STATIC_PALETTE, type ChartPalette } from "./chart-palette";

export type AccentPalette = ChartPalette;

function shade(rgb: [number, number, number], factor: number): string {
  // factor < 1 → lighter (mix with white); factor > 1 → darker.
  let [r, g, b] = rgb;
  if (factor < 1) {
    const t = 1 - factor;
    r = Math.round(r + (255 - r) * t);
    g = Math.round(g + (255 - g) * t);
    b = Math.round(b + (255 - b) * t);
  } else {
    const k = 1 / factor;
    r = Math.round(r * k);
    g = Math.round(g * k);
    b = Math.round(b * k);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function readAccentRgb(): [number, number, number] | null {
  if (typeof window === "undefined") return null;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-rgb")
    .trim();
  if (!v) return null;
  const parts = v.split(/[\s,]+/).map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  return [parts[0], parts[1], parts[2]];
}

function buildPalette(rgb: [number, number, number] | null): AccentPalette {
  if (!rgb) return STATIC_PALETTE;
  const [r, g, b] = rgb;
  return {
    ...STATIC_PALETTE,
    primary:       `rgb(${r}, ${g}, ${b})`,
    primaryStrong: shade(rgb, 1.25),
    primarySoft:   shade(rgb, 0.65),
    primaryFaint:  shade(rgb, 0.25),
  };
}

/**
 * Returns a palette derived from the current accent. Falls back to the
 * static emerald palette during SSR and the first paint, then swaps in
 * the live accent once mounted. Rerenders when accent changes.
 */
export function useAccentPalette(): AccentPalette {
  const [palette, setPalette] = useState<AccentPalette>(STATIC_PALETTE);

  useEffect(() => {
    setPalette(buildPalette(readAccentRgb()));

    function refresh() {
      setPalette(buildPalette(readAccentRgb()));
    }
    function onStorage(e: StorageEvent) {
      if (e.key === "fuellog-accent") refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("fuellog:accent-changed", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fuellog:accent-changed", refresh as EventListener);
    };
  }, []);

  return palette;
}
