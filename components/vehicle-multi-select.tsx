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
import { CheckSquare, Square } from "lucide-react";
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
    <div className="card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400">
          Vozidla{" "}
          <span className="font-normal text-slate-400">
            · {allSelected ? "vše" : `${selected.size}/${vehicles.length}`}
          </span>
        </span>
        {!allSelected && (
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-slate-500 hover:text-sky-600"
          >
            Vybrat vše
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {vehicles.map((v) => {
          const on = allSelected || selected.has(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => toggle(v.id)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition ${
                on
                  ? "bg-sky-50 border-sky-300 text-sky-800 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-200"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
              style={{ borderLeft: v.color ? `3px solid ${v.color}` : undefined }}
            >
              {on ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              <VehicleAvatar
                photoPath={v.photo_path}
                color={v.color}
                size="sm"
                className="!w-4 !h-4"
              />
              <span className="truncate max-w-[160px]">{v.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
