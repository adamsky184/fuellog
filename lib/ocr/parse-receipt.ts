/**
 * Heuristic parser for Czech fuel-station receipts.
 *
 * The parser is tolerant and best-effort — Czech receipts vary wildly
 * (Shell uses a columnar layout, Benzina squishes everything on one line,
 * Orlen prints "Natural 95" with fuel type + liters on the same line).
 *
 * Strategy:
 *   1. Normalize whitespace and commas.
 *   2. Find brand by keyword match against a known list.
 *   3. Find all monetary / decimal numbers; classify by nearby keywords.
 *   4. Date: try a few common formats in order.
 *
 * Returns partial data — unknown fields are null. The user confirms in the
 * form before anything is saved.
 */

import type { ParsedReceipt } from "./types";

const KNOWN_BRANDS = [
  "SHELL",
  "ORLEN",
  "BENZINA",
  "MOL",
  "OMV",
  "ARAL",
  "EUROOIL",
  "GLOBUS",
  "MAKRO",
  "TOTAL",
  "AGIP",
  "ROBIN OIL",
  "ROBIN",
  "STOPKA",
  "HRUBY",
  "PRIM",
  "LUKOIL",
  "TESCO",
];

/** Brand aliases → canonical form used in fill_ups.station_brand */
const BRAND_CANONICAL: Record<string, string> = {
  "ROBIN OIL": "ROBINOIL",
  "ROBIN": "ROBINOIL",
  "HRUBÝ": "HRUBY",
};

const CURRENCY_MARKERS: Array<[RegExp, "CZK" | "EUR" | "USD"]> = [
  [/\b(?:K[čc]|CZK)\b/i, "CZK"],
  [/€|\bEUR\b/i, "EUR"],
  [/\$|\bUSD\b/i, "USD"],
];

/** "1 234,56" → 1234.56 ; "1.234,56" → 1234.56 ; "1,234.56" → 1234.56 */
function parseCzechNumber(raw: string): number | null {
  if (!raw) return null;
  const s = raw.replace(/\s/g, "");
  // if both , and . present → last separator is decimal
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let cleaned = s;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    cleaned = s.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0) {
    cleaned = s.replace(/,/g, ".");
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Returns all (number, start-index) tuples we find in the text. */
type NumberHit = { value: number; start: number; end: number; raw: string };
function findNumbers(text: string): NumberHit[] {
  const hits: NumberHit[] = [];
  // matches: 1, 1.5, 1,5, 1 234,56, 1.234,56, 1,234.56
  const re = /(?<!\d)\d{1,3}(?:[\s.]\d{3})*[.,]\d{1,3}\b|\b\d+[.,]\d{1,3}\b|\b\d{2,}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const v = parseCzechNumber(m[0]);
    if (v !== null) hits.push({ value: v, start: m.index, end: m.index + m[0].length, raw: m[0] });
  }
  return hits;
}

/** Lines near an index, within [-before, +after] chars. */
function context(text: string, idx: number, before = 25, after = 25): string {
  return text.slice(Math.max(0, idx - before), Math.min(text.length, idx + after));
}

function findBrand(text: string): string | null {
  const upper = text.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    // match as a whole word, tolerate OCR noise (diacritics stripped)
    const re = new RegExp(`\\b${b.replace(/\s/g, "\\s?")}\\b`, "i");
    if (re.test(upper)) return BRAND_CANONICAL[b] ?? b.replace(/\s/g, "");
  }
  return null;
}

function findCurrency(text: string): "CZK" | "EUR" | "USD" | null {
  for (const [re, cur] of CURRENCY_MARKERS) if (re.test(text)) return cur;
  return null;
}

function findDate(text: string): string | null {
  // 15.04.2026  |  15. 4. 2026  |  15/04/2026  |  15-04-2026
  const re1 = /\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})\b/;
  const m1 = text.match(re1);
  if (m1) {
    const dd = +m1[1];
    const mm = +m1[2];
    let yy = +m1[3];
    if (yy < 100) yy += yy < 70 ? 2000 : 1900;
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yy >= 2000 && yy <= 2100) {
      return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
  }
  // ISO 2026-04-15
  const re2 = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/;
  const m2 = text.match(re2);
  if (m2) {
    const yy = +m2[1];
    const mm = +m2[2];
    const dd = +m2[3];
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Keyword → which field it hints at */
const HINTS = {
  liters: /(?:litr|l[\s:]|\bL\b|objem|množství)/i,
  pricePerL: /(?:cena[ /.\-]*l|jednotkov[aá]|kč[ /]*l|k\/l|cena za l)/i,
  total: /(?:celkem|k[ .]úhrad[eě]|suma|total|k platb[ěe]|k zaplacen[ií])/i,
} as const;

function pickBest(
  hits: NumberHit[],
  text: string,
  hint: RegExp,
  filter: (n: NumberHit) => boolean,
): NumberHit | null {
  const scored = hits
    .filter(filter)
    .map((h) => {
      const ctx = context(text, h.start, 40, 40).toLowerCase();
      const score = hint.test(ctx) ? 10 : 0;
      return { h, score };
    })
    .sort((a, b) => b.score - a.score || b.h.value - a.h.value);
  return scored[0]?.h ?? null;
}

export function parseReceipt(text: string): ParsedReceipt {
  const clean = text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
  const hits = findNumbers(clean);
  const currency = findCurrency(clean) ?? "CZK";

  // liters: decimal number 5–200 with "L" context
  const litersHit = pickBest(
    hits,
    clean,
    HINTS.liters,
    (h) => h.value >= 1 && h.value <= 200 && /[.,]/.test(h.raw),
  );

  // price/l: decimal 10–200 (Kč) with cena/l context
  const pricePerLHit = pickBest(
    hits,
    clean,
    HINTS.pricePerL,
    (h) => h.value >= 5 && h.value <= 200 && /[.,]/.test(h.raw),
  );

  // total: biggest decimal value with "celkem" context; fallback to largest decimal
  let totalHit = pickBest(
    hits,
    clean,
    HINTS.total,
    (h) => h.value >= 10 && /[.,]/.test(h.raw),
  );
  if (!totalHit) {
    const decimals = hits.filter((h) => /[.,]/.test(h.raw) && h.value >= 10);
    totalHit = decimals.sort((a, b) => b.value - a.value)[0] ?? null;
  }

  const brand = findBrand(clean);
  const date = findDate(clean);

  // sanity check: if we have price/l and liters, compare to total;
  // if total disagrees by >50% swap in liters×pricePerL as more trusted.
  let total = totalHit?.value ?? null;
  if (
    litersHit &&
    pricePerLHit &&
    total !== null &&
    Math.abs(total - litersHit.value * pricePerLHit.value) / total > 0.5
  ) {
    total = +(litersHit.value * pricePerLHit.value).toFixed(2);
  }

  // confidence: crude — count how many fields we found
  const foundFields = [litersHit, pricePerLHit, totalHit, brand, date].filter(
    Boolean,
  ).length;
  const confidence = foundFields / 5;

  return {
    liters: litersHit?.value ?? null,
    total_price: total,
    price_per_liter: pricePerLHit?.value ?? null,
    station_brand: brand,
    // Tesseract fallback doesn't attempt location extraction — the AI path
    // (Edge function) is the only place station_location gets populated.
    station_location: null,
    date,
    currency,
    confidence,
    raw_text: text,
  };
}
