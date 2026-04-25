/**
 * Currency conversion (v2.8.0).
 *
 * Flat-rate single-rate-per-currency table — Adam fills up abroad
 * occasionally, and we just need a "≈ Kč" reference so stats roll up
 * to a single number. Date-aware rates can come later if anyone needs
 * historical accuracy.
 *
 * The same numbers live in the DB function `convert_to_czk(numeric, text)`
 * — keep them in sync with the migration `regions_to_kraje`.
 */

export const CZK_RATES: Record<string, number> = {
  CZK: 1,
  EUR: 25.0,
  CHF: 26.5,
  PLN: 5.5,
  HRK: 3.3, // pre-2023, retained for historical Chorvatsko data
  USD: 23.0,
  GBP: 29.0,
};

/** Default rate used when an unknown currency shows up in the data. */
const FALLBACK_RATE = 25.0;

export function rateToCzk(currency: string | null | undefined): number {
  if (!currency) return 1;
  return CZK_RATES[currency.toUpperCase()] ?? FALLBACK_RATE;
}

/**
 * Convert any (amount, currency) to CZK using the flat rate table.
 * `null`/missing amounts pass through. Already-CZK amounts are returned as-is.
 */
export function toCzk(amount: number | null | undefined, currency: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  return Math.round(amount * rateToCzk(currency) * 100) / 100;
}

/**
 * Render an "amount + ≈ Kč" hint as a single string. Used inline in lists
 * where a separate currency badge would crowd the row.
 *
 *   formatWithCzkHint(42.4, "EUR")  // "42,4 € (≈ 1 060 Kč)"
 *   formatWithCzkHint(1450, "CZK")  // "1 450 Kč"
 */
export function formatWithCzkHint(
  amount: number | null | undefined,
  currency: string | null | undefined,
  opts: { digits?: number } = {},
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const cur = (currency ?? "CZK").toUpperCase();
  const native = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: opts.digits ?? 0,
  }).format(amount);
  if (cur === "CZK") return native;
  const czk = toCzk(amount, cur);
  if (czk == null) return native;
  const czkStr = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(czk);
  return `${native} (≈ ${czkStr})`;
}
