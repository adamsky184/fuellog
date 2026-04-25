/**
 * Country flag emoji for ISO-3166 alpha-2 codes (v2.9.1).
 *
 * We render the flag as a regional-indicator emoji pair, which Unicode
 * resolves to the country's flag on every modern OS without needing a
 * font asset. CZ stays empty intentionally — the app is CZ-default and
 * flagging every domestic row would be visual noise.
 */

const FLAGGED = new Set([
  "AT", "BE", "CH", "DE", "ES", "FR", "GB", "HR", "HU", "IT",
  "NL", "PL", "PT", "SI", "SK",
]);

export function countryFlag(country: string | null | undefined): string {
  if (!country) return "";
  const c = country.toUpperCase();
  if (c === "CZ") return ""; // domestic — no flag
  if (!FLAGGED.has(c)) return "";
  // Regional indicator letter = U+1F1E6 + (letter - 'A')
  const a = c.charCodeAt(0);
  const b = c.charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return "";
  return String.fromCodePoint(0x1f1e6 + a - 65, 0x1f1e6 + b - 65);
}
