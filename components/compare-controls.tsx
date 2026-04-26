"use client";

/**
 * v2.12.0 — multi-select pills for the /compare page.
 *
 * Click a vehicle to toggle it in the comparison set (max 4). State
 * lives in `?vehicles=v1,v2,v3` so the page is shareable / bookmarkable.
 */

import { useRouter, useSearchParams } from "next/navigation";

type VehicleOpt = { id: string; name: string; subtitle?: string };

const MAX_SELECTED = 4;

export function CompareControls({
  vehicles,
  selected,
}: {
  vehicles: VehicleOpt[];
  selected: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function toggle(id: string) {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else if (set.size < MAX_SELECTED) set.add(id);
    const next = [...set];
    const params = new URLSearchParams(sp.toString());
    if (next.length === 0) params.delete("vehicles");
    else params.set("vehicles", next.join(","));
    router.replace(`?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Vyber 2–{MAX_SELECTED} auta
        </div>
        <div className="text-[11px] text-slate-400">
          {selected.length} / {MAX_SELECTED}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {vehicles.map((v) => {
          const isOn = selected.includes(v.id);
          const disabled = !isOn && selected.length >= MAX_SELECTED;
          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(v.id)}
              className={`inline-flex flex-col items-start gap-0 px-3 py-1.5 rounded-md border text-left transition ${
                isOn
                  ? "bg-accent text-white border-accent"
                  : disabled
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-accent hover:bg-accent/5"
              }`}
            >
              <span className="text-sm font-medium leading-tight">{v.name}</span>
              {v.subtitle && (
                <span className={`text-[10px] leading-tight ${isOn ? "text-white/80" : "text-slate-400"}`}>
                  {v.subtitle}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
