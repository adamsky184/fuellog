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
 * Map region codes from Adam's xlsx to { region, country }.
 * Short Prague codes P1..P10 → CZ/P1..P10.
 * CZ regional codes (StČ, JČ, VČ, ZČ, SČ, JM, SM, D) → CZ/<code>.
 * Country codes (AT, SK, DE, IT, ES, FR, CH, HR, NL, PT, PL, SI, BE, other) → <code>/null.
 */
export function mapRegionCode(code: string | null | undefined): {
  region: string | null;
  country: string;
} {
  if (!code) return { region: null, country: "CZ" };
  const c = code.trim();

  const czRegional = [
    "P1","P2","P3","P4","P5","P6","P7","P8","P9","P10",
    "StČ","JČ","VČ","ZČ","SČ","JM","SM","D",
  ];
  if (czRegional.includes(c)) return { region: c, country: "CZ" };

  // Country-only codes from Adam's xlsx
  const countryMap: Record<string, string> = {
    AT: "AT", SK: "SK", DE: "DE", IT: "IT", ES: "ES",
    FR: "FR", CH: "CH", HR: "HR", NL: "NL", PT: "PT",
    PL: "PL", SI: "SI", BE: "BE",
  };
  if (countryMap[c]) return { region: null, country: countryMap[c] };

  // Fallback: assume CZ, keep raw code as region
  return { region: c, country: "CZ" };
}
