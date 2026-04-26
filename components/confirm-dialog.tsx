"use client";

/**
 * v2.16.0 — replaces native window.confirm() (used in 8 files for
 * delete operations) with an in-app modal. Reasons:
 *   - native confirm looks like 1998 + breaks dark mode
 *   - it pauses the JS thread; offline-queue flushes can stall
 *   - on mobile Safari it's a tiny 320 px box that drops below
 *     the keyboard
 *
 * Usage:
 *   const confirm = useConfirm();
 *   ...
 *   const ok = await confirm({
 *     title: "Smazat tankování?",
 *     message: "Tato akce je nevratná.",
 *     confirmLabel: "Smazat",
 *     tone: "danger",
 *   });
 *   if (!ok) return;
 *
 * The hook attaches one global modal to the document; mount once via
 * <ConfirmDialogHost/> at the layout level.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Tone = "danger" | "warn" | "neutral";

type ConfirmRequest = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type Pending = ConfirmRequest & {
  resolve: (ok: boolean) => void;
};

type Ctx = (req: ConfirmRequest) => Promise<boolean>;

const ConfirmContext = createContext<Ctx | null>(null);

export function ConfirmDialogHost({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback((req: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...req, resolve });
    });
  }, []);

  function close(ok: boolean) {
    if (!pending) return;
    pending.resolve(ok);
    setPending(null);
  }

  const tone = pending?.tone ?? "neutral";
  const confirmClass =
    tone === "danger"
      ? "btn-primary !bg-rose-600 hover:!brightness-110"
      : tone === "warn"
        ? "btn-primary !bg-amber-600 hover:!brightness-110"
        : "btn-primary";

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {(tone === "danger" || tone === "warn") && (
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full ${
                    tone === "danger"
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-base font-semibold tracking-tight">
                  {pending.title}
                </h2>
                {pending.message && (
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {pending.message}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => close(false)}
                className="btn-secondary text-sm"
              >
                {pending.cancelLabel ?? "Zrušit"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                autoFocus
                className={`${confirmClass} text-sm`}
              >
                {pending.confirmLabel ?? "Potvrdit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ctx {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to native confirm if host isn't mounted (e.g. an
    // isolated client component outside the (app) layout).
    return (req) =>
      Promise.resolve(
        window.confirm(
          req.title +
            (req.message && typeof req.message === "string" ? `\n\n${req.message}` : ""),
        ),
      );
  }
  return ctx;
}
