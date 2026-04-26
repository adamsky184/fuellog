/**
 * v2.11.0 — Czech motorway codes used by the fill-up form.
 *
 * The schema stores highway info in two fields:
 *  - `is_highway` (boolean) — toggles the "počítat zvlášť" stats split
 *  - `address`              — free text. The convention is to prefix the
 *                             highway code, e.g. "D5 · Rozvadov".
 *
 * Up to v2.10.x the user had to type "D5" manually into the address.
 * v2.11.0 adds an explicit dropdown that prepends/replaces the prefix
 * for them, so all highway entries follow the same shape.
 */

export type HighwayOption = { code: string; label: string };

/** Currently-built CZ motorway codes (D-network). Updated 2026. */
export const CZ_HIGHWAYS: HighwayOption[] = [
  { code: "D0",  label: "D0 — Pražský okruh" },
  { code: "D1",  label: "D1 — Praha–Brno–Ostrava" },
  { code: "D2",  label: "D2 — Brno–Břeclav" },
  { code: "D3",  label: "D3 — Praha–České Budějovice" },
  { code: "D4",  label: "D4 — Praha–Příbram" },
  { code: "D5",  label: "D5 — Praha–Plzeň–Rozvadov" },
  { code: "D6",  label: "D6 — Praha–Karlovy Vary–Cheb" },
  { code: "D7",  label: "D7 — Praha–Chomutov" },
  { code: "D8",  label: "D8 — Praha–Ústí–Drážďany" },
  { code: "D10", label: "D10 — Praha–Mladá Boleslav" },
  { code: "D11", label: "D11 — Praha–Hradec Králové" },
  { code: "D35", label: "D35 — Hradec Králové–Olomouc" },
  { code: "D46", label: "D46 — Vyškov–Olomouc" },
  { code: "D48", label: "D48 — Bělotín–Frýdek-Místek" },
  { code: "D52", label: "D52 — Brno–Mikulov" },
  { code: "D55", label: "D55 — Olomouc–Břeclav" },
  { code: "D56", label: "D56 — Ostrava–Frýdek-Místek" },
];

/** Read the highway code from an address string ("D5 · Rozvadov" → "D5"). */
export function parseHighwayCode(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = String(address).match(/^D\s?(\d{1,2})\b/i);
  return m ? `D${m[1]}` : null;
}

/** Strip any existing "DXX · " prefix and return the rest (or empty). */
export function stripHighwayPrefix(address: string | null | undefined): string {
  if (!address) return "";
  return String(address).replace(/^D\s?\d{1,2}\s*·?\s*/i, "").trim();
}

/**
 * Apply a chosen highway code to an existing address, preserving any
 * detail the user has already typed.
 *   ("", "D5")              → "D5"
 *   ("Rozvadov", "D5")      → "D5 · Rozvadov"
 *   ("D8 · Lovosice", "D5") → "D5 · Lovosice"
 *   ("Žernosecká", null)    → "Žernosecká"   // clearing highway code
 */
export function applyHighwayCodeToAddress(
  address: string | null | undefined,
  code: string | null,
): string {
  const rest = stripHighwayPrefix(address);
  if (!code) return rest;
  if (!rest) return code;
  return `${code} · ${rest}`;
}
