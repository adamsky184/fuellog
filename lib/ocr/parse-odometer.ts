/**
 * Odometer parser — finds a plausible km reading in noisy OCR text.
 *
 * We assume a 4–7 digit integer. Modern cars show 6 digits (e.g. 123 456).
 * If the digital display has a trip-meter (smaller number like "345.2"),
 * we ignore anything with a decimal, and ignore numbers < 1 000 or > 2 000 000.
 */

import type { ParsedOdometer } from "./types";

export function parseOdometer(text: string, previousKm?: number): ParsedOdometer {
  const clean = text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");

  // pull integer-like candidates (allow thousands spaces but no decimals)
  const candidates: number[] = [];
  const re = /\b\d{1,3}(?:[\s.]\d{3}){1,2}\b|\b\d{4,7}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const n = parseInt(m[0].replace(/[\s.]/g, ""), 10);
    if (Number.isFinite(n) && n >= 1_000 && n <= 2_000_000) candidates.push(n);
  }

  if (!candidates.length) {
    return { km: null, confidence: 0, raw_text: text };
  }

  // If we know the previous odometer reading, prefer candidates that are
  // >= previous (cars only count up) and within +200_000 km.
  let best: number | null = null;
  if (previousKm && previousKm > 0) {
    const valid = candidates.filter(
      (c) => c >= previousKm && c <= previousKm + 200_000,
    );
    if (valid.length) best = Math.max(...valid);
  }
  if (best === null) {
    // no hint or no valid candidate → pick largest
    best = Math.max(...candidates);
  }

  // confidence: higher when one clear candidate; lower when many competing
  const unique = new Set(candidates).size;
  const confidence = unique === 1 ? 0.9 : unique <= 3 ? 0.6 : 0.35;

  return { km: best, confidence, raw_text: text };
}
