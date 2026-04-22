"use client";

/**
 * Small unobtrusive "Add FuelLog to home screen" banner.
 *
 * - Listens for `beforeinstallprompt` (Chromium). iOS Safari does not emit
 *   this event, so iOS users still have to use the Share → Přidat na plochu
 *   menu — we detect iOS and show a helpful hint instead.
 * - Respects two suppressions:
 *     1. User clicked "Později" → `fuellog-install-dismissed-at` in localStorage,
 *        hides for 14 days.
 *     2. App is already installed (`display-mode: standalone` or iOS `navigator.standalone`).
 */

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "fuellog-install-dismissed-at";
const SUPPRESS_DAYS = 14;

function isRecentlyDismissed(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const ageMs = Date.now() - Number(at);
    return ageMs < SUPPRESS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS exposes a non-standard `standalone` on navigator.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isRecentlyDismissed()) return;

    const iosDevice = isIos();
    setIos(iosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // On iOS the install event never fires, so show the hint after a short delay
    // to avoid appearing on a cold redirect to /login.
    if (iosDevice) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } catch {
      /* ignore */
    }
    setPromptEvent(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-40 max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-lg
        dark:bg-slate-900 dark:border-slate-700"
      role="dialog"
      aria-label="Nainstalovat FuelLog"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent text-white grid place-items-center shrink-0">
          <Download className="h-4 w-4" />
        </div>
        <div className="text-sm">
          <div className="font-semibold">Přidat FuelLog na plochu</div>
          {ios && !promptEvent ? (
            <p className="muted mt-1">
              V Safari klepni na <b>Sdílet</b> a zvol <b>Přidat na plochu</b>.
            </p>
          ) : (
            <p className="muted mt-1">
              Nainstaluj si FuelLog jako aplikaci — funguje i offline.
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Zavřít"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {promptEvent && (
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={dismiss} className="btn-secondary text-xs" type="button">
            Později
          </button>
          <button onClick={install} className="btn-primary text-xs" type="button">
            Nainstalovat
          </button>
        </div>
      )}
    </div>
  );
}
