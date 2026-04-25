/**
 * Currency conversion (v2.8.1).
 *
 * The DB now holds a per-day rate table (`currency_rates`) populated from
 * ČNB and refreshed daily by pg_cron, so the *real* CZK conversion happens
 * server-side via `public.convert_to_czk(amount, currency, date)` in the
 * `fill_up_stats_v` view (column `total_price_czk`).
 *
 * The flat fallbacks below remain for:
 *  - dates before the historical table starts (~2012);
 *  - currencies the table doesn't know about;
 *  - quick client-side hints when the table hasn't been queried yet.
 * Keep them in sync with the SQL `convert_to_czk` fallback CASE.
 */

export const CZK_RATES: Record<string, number> = {
  CZK: 1,
  EUR: 25.0,
  CHF: 26.5,
  PLN: 5.5,
  HUF: 0.067,
  HRK: 3.3, // pre-2023, retained for historical Chorvatsko data
  USD: 23.0,
  GBP: 29.0,
};

/** Currencies offered in the fill-up form's dropdown. */
export const SUPPORTED_CURRENCIES = ["CZK", "EUR", "CHF", "PLN", "HUF", "GBP", "USD", "HRK"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

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
