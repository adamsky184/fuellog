"use client";

/**
 * v2.13.2 — compact accent-colour picker rendered in the header,
 * mirroring the DAY/NIGHT theme toggle. Click → popover with the same
 * 7 swatches as the full picker on /profile. The two views are
 * synchronised through the same applyAccent() / loadAccent() helpers.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { ACCENT_PRESETS, applyAccent, loadAccent, type AccentPreset } from "@/lib/theme";

export function AccentToggle() {
  const [active, setActive] = useState<AccentPreset>(ACCENT_PRESETS[0]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(loadAccent());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(p: AccentPreset) {
    applyAccent(p);
    setActive(p);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Změnit barvu rozhraní"
        title="Barva rozhraní"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
      >
        <Palette className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span
          aria-hidden
          className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-slate-900"
          style={{ backgroundColor: active.swatch }}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-50 card p-2 shadow-lg border-slate-200 dark:border-slate-700 min-w-[180px]"
        >
          <div className="grid grid-cols-4 gap-1">
            {ACCENT_PRESETS.map((p) => {
              const isActive = active.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  aria-label={p.label}
                  title={p.label}
                  className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg transition ${
                    isActive
                      ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                      : "hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: p.swatch,
                    ...(isActive ? { boxShadow: `0 0 0 2px ${p.swatch}` } : {}),
                  }}
                >
                  {isActive && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              <span className="font-medium text-slate-700 dark:text-slate-200">{active.label}</span>
              <div className="text-[10px] text-slate-400">Uloženo lokálně, neopouští zařízení.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
