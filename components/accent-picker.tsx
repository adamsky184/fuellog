"use client";

/**
 * v2.11.0 — accent colour picker rendered in /profile.
 *
 * Plain CSS swatches; clicking persists to localStorage and immediately
 * updates the CSS custom properties so the user sees the change without
 * a reload.
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ACCENT_PRESETS, applyAccent, loadAccent, type AccentPreset } from "@/lib/theme";

export function AccentPicker() {
  const [active, setActive] = useState<string>(ACCENT_PRESETS[0].id);

  useEffect(() => {
    setActive(loadAccent().id);
  }, []);

  function pick(p: AccentPreset) {
    applyAccent(p);
    setActive(p.id);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Barva rozhraní
      </div>
      <div className="flex flex-wrap gap-2">
        {ACCENT_PRESETS.map((p) => {
          const isActive = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              aria-label={p.label}
              title={p.label}
              className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full ring-2 transition ${
                isActive
                  ? "ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                  : "ring-transparent hover:ring-slate-300"
              }`}
              style={{
                backgroundColor: p.swatch,
                ...(isActive
                  ? { boxShadow: `0 0 0 2px ${p.swatch}` }
                  : {}),
              }}
            >
              {isActive && (
                <Check className="h-4 w-4 text-white drop-shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Volba se uloží jen v tomto prohlížeči — neukládá se na server.
      </p>
    </div>
  );
}
