/**
 * Country flag emoji for ISO-3166 alpha-2 codes (v2.9.1, expanded
 * v2.14.5).
 *
 * We render the flag as a regional-indicator emoji pair, which Unicode
 * resolves to the country's flag on every modern OS without needing a
 * font asset. CZ stays empty intentionally — the app is CZ-default and
 * flagging every domestic row would be visual noise.
 *
 * v2.14.5 — removed the previous 15-country whitelist. Adam tankuje in
 * Norway / Sweden / Finland / Ireland / Denmark (all in the Europe map)
 * and they were silently blank. The regional-indicator trick works for
 * ANY valid ISO-3166 alpha-2 pair, so we just validate the format and
 * return — modern OSes draw the flag, unknown / unassigned codes show
 * a neutral two-letter glyph (acceptable fallback).
 */

export function countryFlag(country: string | null | undefined): string {
  if (!country) return "";
  const c = country.toUpperCase();
  if (c === "CZ") return ""; // domestic — no flag
  if (c.length !== 2) return "";
  const a = c.charCodeAt(0);
  const b = c.charCodeAt(1);
  // Valid ISO-3166 alpha-2 = two uppercase ASCII letters.
  if (a < 65 || a > 90 || b < 65 || b > 90) return "";
  // Regional indicator letter = U+1F1E6 + (letter - 'A').
  return String.fromCodePoint(0x1f1e6 + a - 65, 0x1f1e6 + b - 65);
}
