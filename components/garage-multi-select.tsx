/**
 * v2.9.9 — GarageMultiSelect (dropdown popover variant).
 *
 * Same pattern as VehicleMultiSelect; sits next to it on cross-garage
 * stats. Updates `?garages=g1,g2`. Selecting/clearing a garage also
 * clears the per-vehicle filter so the chip list stays consistent.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Warehouse } from "lucide-react";

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

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    const next = new Set(selected.size === 0 ? garages.map((g) => g.id) : selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const sp = new URLSearchParams(params.toString());
    if (next.size === 0 || next.size === garages.length) sp.delete("garages");
    else sp.set("garages", [...next].join(","));
    sp.delete("vehicles");
    router.replace(`?${sp.toString()}`, { scroll: false });
    router.refresh();
  }
  function selectAll() {
    const sp = new URLSearchParams(params.toString());
    sp.delete("garages");
    sp.delete("vehicles");
    router.replace(`?${sp.toString()}`, { scroll: false });
    router.refresh();
  }

  if (garages.length <= 1) return null;

  const summary = allSelected
    ? `vše · ${garages.length}`
    : `${selected.size}/${garages.length}`;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition rounded-lg px-1 py-0.5"
      >
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
          <Warehouse className="h-4 w-4" />
        </span>
        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
          Garáže
        </span>
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{summary}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute left-0 mt-1.5 w-[min(90vw,22rem)] max-h-[60vh] overflow-auto
                     rounded-xl border border-slate-200 bg-white shadow-lg
                     dark:bg-slate-900 dark:border-slate-700
                     py-1 z-30"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
              {allSelected ? `vše vybráno · ${garages.length}` : `vybráno ${selected.size}/${garages.length}`}
            </span>
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
          <ul className="py-1">
            {garages.map((g) => {
              const on = allSelected || selected.has(g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    role="option"
                    aria-selected={on}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <span
                      className={`inline-flex items-center justify-center h-4 w-4 rounded border ${
                        on
                          ? "bg-sky-600 border-sky-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate flex-1">{g.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
