/**
 * v2.9.6 — VehicleMultiSelect
 *
 * Pill-style chip selector for filtering which vehicles contribute to a
 * stats view. Updates `?vehicles=v1,v2` in the URL, which the server-side
 * stats page reads and uses for the IN clause.
 *
 * Empty selection (no `?vehicles`) means "all vehicles".
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { VehicleAvatar } from "@/components/vehicle-avatar";

export type VehicleOption = {
  id: string;
  name: string;
  color: string | null;
  photo_path: string | null;
};

export function VehicleMultiSelect({
  vehicles,
  paramName = "vehicles",
}: {
  vehicles: VehicleOption[];
  paramName?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get(paramName);
  const selected = new Set((raw ?? "").split(",").filter(Boolean));
  const allSelected = selected.size === 0; // "all" when empty

  function toggle(id: string) {
    const next = new Set(selected.size === 0 ? vehicles.map((v) => v.id) : selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const sp = new URLSearchParams(params.toString());
    if (next.size === 0 || next.size === vehicles.length) {
      sp.delete(paramName);
    } else {
      sp.set(paramName, [...next].join(","));
    }
    router.replace(`?${sp.toString()}`, { scroll: false });
  }
  function selectAll() {
    const sp = new URLSearchParams(params.toString());
    sp.delete(paramName);
    router.replace(`?${sp.toString()}`, { scroll: false });
  }

  if (vehicles.length <= 1) return null;

  return (
    <div className="card p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
            Vozidla
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {allSelected ? `vše · ${vehicles.length}` : `${selected.size}/${vehicles.length}`}
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
      {/* v2.9.7 — cleaner chip design: avatar + name + small check icon. Selected
           = solid filled (high contrast), unselected = ghost (faded). No
           leftover left-border accent — the avatar itself already carries the
           car's identity. */}
      <div className="flex flex-wrap gap-1.5">
        {vehicles.map((v) => {
          const on = allSelected || selected.has(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => toggle(v.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs border transition ${
                on
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <VehicleAvatar
                photoPath={v.photo_path}
                color={v.color}
                size="sm"
                className="!w-5 !h-5 ring-2 ring-white dark:ring-slate-900"
              />
              <span className="truncate max-w-[160px]">{v.name}</span>
              {on && <CheckSquare className="h-3 w-3 opacity-70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
