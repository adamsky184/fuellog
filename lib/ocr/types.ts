/**
 * Types for photo OCR autofill.
 *
 * Two flavours of photo:
 *  - receipt  → extract liters, price, price/l, brand, date
 *  - odometer → extract one integer (km)
 *
 * Both parsers are best-effort — the user always confirms in the form before saving.
 */

export type ParsedReceipt = {
  liters: number | null;
  total_price: number | null;
  price_per_liter: number | null;
  station_brand: string | null;
  date: string | null; // ISO yyyy-mm-dd
  currency: "CZK" | "EUR" | "USD" | null;
  /** confidence 0–1 for debug/UI hints */
  confidence: number;
  /** raw OCR text (kept for debug + for letting the user see what was read) */
  raw_text: string;
};

export type ParsedOdometer = {
  km: number | null;
  confidence: number;
  raw_text: string;
};

export type OcrProgress = {
  stage: "loading" | "recognizing" | "parsing" | "done" | "error";
  /** 0–1 where known */
  progress?: number;
  message?: string;
};
