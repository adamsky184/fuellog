"use client";

/**
 * Reusable photo-capture + OCR widget.
 *
 * Two flavours:
 *   kind="receipt"  → parses liters / price / brand / date
 *   kind="odometer" → parses a km reading
 *
 * The component is stateful (it owns the preview + progress) but emits:
 *   - onParsed(parsed, file) — whenever a new photo is processed
 *   - onClear()              — when the user removes the photo
 *
 * The parent decides what to do with the parsed fields (usually: merge into
 * form state so the user can review/edit before saving).
 */

import { useRef, useState } from "react";
import { Camera, Loader2, X, Check, AlertTriangle, Sparkles } from "lucide-react";
import { recognize } from "@/lib/ocr/tesseract-client";
import { parseReceipt } from "@/lib/ocr/parse-receipt";
import { parseOdometer } from "@/lib/ocr/parse-odometer";
import type {
  ParsedReceipt,
  ParsedOdometer,
  OcrProgress,
} from "@/lib/ocr/types";

type Kind = "receipt" | "odometer";

export type PhotoOcrProps<K extends Kind> = {
  kind: K;
  onParsed: (
    parsed: K extends "receipt" ? ParsedReceipt : ParsedOdometer,
    file: File,
  ) => void;
  onClear?: () => void;
  /** Only relevant for odometer — helps disambiguate trip-meter vs. total km. */
  previousKm?: number;
  /** When the user has an AI key configured, use the Edge function instead.
   *  Phase 2 will pass a function here that calls supabase.functions.invoke(). */
  aiDispatcher?: (
    file: File,
    kind: Kind,
  ) => Promise<ParsedReceipt | ParsedOdometer>;
  /** true = AI mode active (shown visually) */
  aiActive?: boolean;
  label?: string;
};

export function PhotoOcr<K extends Kind>(props: PhotoOcrProps<K>) {
  const { kind, onParsed, onClear, previousKm, aiDispatcher, aiActive, label } =
    props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneSummary, setDoneSummary] = useState<string | null>(null);

  const title =
    label ?? (kind === "receipt" ? "Nafoť účtenku" : "Nafoť tachometr");

  async function handleFile(file: File) {
    setError(null);
    setDoneSummary(null);
    setBusy(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setProgress({ stage: "loading", message: "Start…" });

    try {
      let parsed: ParsedReceipt | ParsedOdometer;
      if (aiDispatcher && aiActive) {
        setProgress({ stage: "recognizing", message: "AI rozpoznává…" });
        parsed = await aiDispatcher(file, kind);
      } else {
        const { text } = await recognize(file, (p) => setProgress(p));
        setProgress({ stage: "parsing", message: "Hledám údaje…" });
        parsed =
          kind === "receipt"
            ? parseReceipt(text)
            : parseOdometer(text, previousKm);
      }
      setProgress({ stage: "done" });
      setDoneSummary(summarize(parsed, kind));
      onParsed(parsed as ParsedReceipt & ParsedOdometer, file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR selhalo.");
      setProgress({ stage: "error" });
    } finally {
      setBusy(false);
    }
  }

  function summarize(
    p: ParsedReceipt | ParsedOdometer,
    k: Kind,
  ): string {
    if (k === "odometer") {
      const o = p as ParsedOdometer;
      return o.km != null ? `Načteno: ${o.km.toLocaleString("cs-CZ")} km` : "Nenalezeno.";
    }
    const r = p as ParsedReceipt;
    const parts = [] as string[];
    if (r.liters != null) parts.push(`${r.liters} L`);
    if (r.total_price != null) parts.push(`${r.total_price} ${r.currency ?? ""}`);
    if (r.station_brand) parts.push(r.station_brand);
    if (r.date) parts.push(r.date);
    return parts.length ? `Načteno: ${parts.join(" · ")}` : "Nic se nepodařilo načíst.";
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setProgress(null);
    setDoneSummary(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {!previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50/50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-sky-900/20 transition"
        >
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">{title}</span>
          {aiActive && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <Sparkles className="h-3 w-3" /> AI
            </span>
          )}
        </button>
      )}

      {previewUrl && (
        <div className="flex gap-3 items-start p-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={title}
            className="h-20 w-20 object-cover rounded border border-slate-300 dark:border-slate-600 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              {busy && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {progressLabel(progress)}
                  </span>
                </>
              )}
              {!busy && doneSummary && !error && (
                <>
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {doneSummary}
                  </span>
                </>
              )}
              {error && (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="truncate text-amber-700 dark:text-amber-300">
                    {error}
                  </span>
                </>
              )}
            </div>
            {busy && progress?.progress != null && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${Math.round(progress.progress * 100)}%` }}
                />
              </div>
            )}
            {!busy && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  Jiná fotka
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs px-2 py-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Odstranit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function progressLabel(p: OcrProgress | null): string {
  if (!p) return "Připravuji…";
  if (p.stage === "loading")
    return p.progress != null
      ? `Načítám engine (${Math.round(p.progress * 100)} %)…`
      : "Načítám engine…";
  if (p.stage === "recognizing")
    return p.progress != null
      ? `Rozpoznávám (${Math.round(p.progress * 100)} %)…`
      : "Rozpoznávám…";
  if (p.stage === "parsing") return "Hledám údaje…";
  if (p.stage === "done") return "Hotovo.";
  if (p.stage === "error") return "Chyba.";
  return "…";
}
