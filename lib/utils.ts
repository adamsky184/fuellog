import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number | null | undefined, currency = "CZK") {
  if (value == null) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" }).format(d);
}

/**
 * v2.19.0 — locale-tolerant decimal parser.
 *
 * Adam: "zadávání litrů se nyní musí dělat s tečkou (67.48) a nefunguje
 * s čárkou (67,48)". CZ keyboards put a comma on the decimal key, so any
 * field where the user types a fractional number (litry, cena, objem
 * nádrže, cost) needs to accept both "67,48" and "67.48". We also strip
 * thousands separators (spaces, NBSP, apostrophes) defensively in case
 * a paste from Excel includes "1 234,56".
 *
 * Returns null for empty/whitespace-only/non-numeric input so callers
 * can decide between "not set" and zero.
 *
 * NOTE: input fields paired with this should use
 * `type="text" inputMode="decimal"`, NOT `type="number"`. Browsers reject
 * a comma in `type="number"` (Chrome/Safari give an empty `e.target.value`
 * the moment the user types ","), so the parser alone isn't enough — the
 * input type matters.
 */
export function parseDecimal(s: string | null | undefined): number | null {
  if (s == null) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/[\s ']/g, "") // strip spaces, NBSP, apostrophes
    .replace(",", ".");          // CZ decimal comma → dot
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Map region codes from Adam's xlsx to { region, country, isHighway }.
 *
 * - Praha: `P1..P10` (or `P 8` typo) → CZ/P1..P10.
 * - Modern kraje: `STC`, `JCK`, `PLK`, `KVK`, `ULK`, `LBK`, `HKK`, `PAK`,
 *   `VYS`, `JMK`, `OLK`, `ZLK`, `MSK` → CZ/<code>.
 * - Legacy historic-land codes (`StČ`, `JČ`, …) → mapped to their best-fit
 *   modern kraj. Lossy. Centralised here so the same mapping is shared by
 *   the xlsx importer and the DB migration.
 * - Highway codes (`D 1`, `D 5`, `D8`, …) → returns `isHighway: true` and
 *   `region: null`. The caller is expected to push the highway number into
 *   `city` so it isn't lost (e.g. "D 1 · Střechov").
 * - Country codes (`D-` = DE, `I-` = IT, …) → <country>/null.
 */
const HISTORIC_TO_KRAJ: Record<string, string> = {
  StČ: "STC",
  JČ: "JCK",
  VČ: "HKK",
  ZČ: "PLK",
  SČ: "ULK",
  JM: "JMK",
  SM: "MSK",
};

const FOREIGN_DASH_TO_COUNTRY: Record<string, string> = {
  // Adam's old xlsx convention: country-letter + "-".
  "D-": "DE",
  "A-": "AT",
  "I-": "IT",
  "F-": "FR",
  "E-": "ES",
  "B-": "BE",
  "NL-": "NL",
  "POR-": "PT",
  "SLO-": "SI",
  "CRO-": "HR",
  "CH-": "CH",
  "PL-": "PL",
  "SK-": "SK",
};

export function mapRegionCode(code: string | null | undefined): {
  region: string | null;
  country: string;
  isHighway: boolean;
  highwayCode: string | null; // e.g. "D1" — caller may merge with city
} {
  if (!code) return { region: null, country: "CZ", isHighway: false, highwayCode: null };
  // Normalise: collapse internal whitespace, trim ends.
  const raw = String(code).trim();
  const c = raw.replace(/\s+/g, " ");

  // Highways: "D 1", "D5", "D 11", … → is_highway=true, region=null.
  const hwMatch = c.match(/^D\s?(\d{1,2})$/i);
  if (hwMatch) {
    return { region: null, country: "CZ", isHighway: true, highwayCode: `D${hwMatch[1]}` };
  }

  // Praha (incl. accidental "P 8" with space).
  const pMatch = c.replace(/\s+/g, "").match(/^P(10|[1-9])$/i);
  if (pMatch) return { region: `P${pMatch[1]}`, country: "CZ", isHighway: false, highwayCode: null };

  // Modern kraj codes (already canonical).
  const KRAJE = new Set([
    "STC", "JCK", "PLK", "KVK", "ULK", "LBK", "HKK", "PAK",
    "VYS", "JMK", "OLK", "ZLK", "MSK",
  ]);
  // Tolerate ČŠ-style accent variants like "STČ" (Adam's xlsx) → STC.
  const folded = c
    .replace(/Č/g, "C").replace(/Š/g, "S").replace(/Ž/g, "Z")
    .replace(/Á/g, "A").replace(/É/g, "E").replace(/Í/g, "I").replace(/Ý/g, "Y")
    .replace(/Ů/g, "U").replace(/Ú/g, "U")
    .toUpperCase();
  if (KRAJE.has(folded)) return { region: folded, country: "CZ", isHighway: false, highwayCode: null };

  // Legacy historic-land codes — silently map to modern kraj.
  if (raw in HISTORIC_TO_KRAJ) {
    return { region: HISTORIC_TO_KRAJ[raw], country: "CZ", isHighway: false, highwayCode: null };
  }

  // Foreign dashes ("D-", "I-", "POR-", …).
  if (c in FOREIGN_DASH_TO_COUNTRY) {
    return { region: null, country: FOREIGN_DASH_TO_COUNTRY[c], isHighway: false, highwayCode: null };
  }

  // Plain country codes ("AT", "SK", …).
  const COUNTRY_CODES = new Set([
    "AT", "SK", "DE", "IT", "ES", "FR", "CH", "HR", "NL", "PT",
    "PL", "SI", "BE",
  ]);
  if (COUNTRY_CODES.has(c.toUpperCase())) {
    return { region: null, country: c.toUpperCase(), isHighway: false, highwayCode: null };
  }

  // Fallback: keep as raw region under CZ (probably needs cleanup).
  return { region: c, country: "CZ", isHighway: false, highwayCode: null };
}
