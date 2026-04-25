/**
 * v2.8.0 — RegionInfobox
 *
 * Tiny details/summary disclosure that decodes the 3-letter kraj codes
 * (STC = Středočeský, JMK = Jihomoravský, …) and the foreign country
 * codes used in the region picker. Same data source as the dropdown
 * itself (`REGION_HELP` from lib/regions.ts) so labels never drift.
 */
"use client";

import { Info } from "lucide-react";
import { REGION_HELP } from "@/lib/regions";

export function RegionInfobox() {
  return (
    <details className="text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <summary className="flex items-center gap-1.5 cursor-pointer px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 select-none">
        <Info className="h-3.5 w-3.5" />
        <span>Vysvětlení zkratek krajů a zemí</span>
      </summary>
      <div className="border-t border-dashed border-slate-200 dark:border-slate-700 p-3 space-y-3">
        {REGION_HELP.map((section) => (
          <div key={section.section}>
            <div className="font-medium text-slate-600 dark:text-slate-300 mb-1">{section.section}</div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5">
              {section.items.map((it) => (
                <li key={it.code} className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200 tabular-nums">
                    {it.code}
                  </span>
                  <span className="truncate">{it.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
