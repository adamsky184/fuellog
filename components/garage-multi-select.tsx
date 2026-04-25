/**
 * v2.9.6 — GarageMultiSelect (cross-garage stats helper).
 *
 * Same chip pattern as VehicleMultiSelect but for garages. Updates
 * `?garages=g1,g2` in the URL. Empty selection = all garages.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, Warehouse } from "lucide-react";

export type GarageOption = {
  id: string;
  name: string;
};

export function GarageMultiSelect({ garages }: { garages: GarageOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("garages");
  const selected = new Set((raw ?? "").split(",").filter(Boolean));
  const allSelected = selected.size === 0;

  function toggle(id: string) {
    const next = new Set(selected.size === 0 ? garages.map((g) => g.id) : selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const sp = new URLSearchParams(params.toString());
    if (next.size === 0 || next.size === garages.length) sp.delete("garages");
    else sp.set("garages", [...next].join(","));
    // changing the garage filter resets the per-vehicle filter so the
    // chip strip below stays consistent with the available cars.
    sp.delete("vehicles");
    router.replace(`?${sp.toString()}`, { scroll: false });
  }
  function selectAll() {
    const sp = new URLSearchParams(params.toString());
    sp.delete("garages");
    sp.delete("vehicles");
    router.replace(`?${sp.toString()}`, { scroll: false });
  }

  if (garages.length <= 1) return null;

  return (
    <div className="card p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
            Garáže
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {allSelected ? `vše · ${garages.length}` : `${selected.size}/${garages.length}`}
          </span>
        </div>
        {!allSelected && (
          <button
            type="button"
            onClick={selectAll}
            className="text-[11px] text-sky-600 hover:underline"
          >
            Vybrat vše
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {garages.map((g) => {
          const on = allSelected || selected.has(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition ${
                on
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <Warehouse className="h-3.5 w-3.5 opacity-70" />
              <span className="truncate max-w-[180px]">{g.name}</span>
              {on && <CheckSquare className="h-3 w-3 opacity-70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
