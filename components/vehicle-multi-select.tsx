/**
 * v2.9.9 — VehicleMultiSelect (dropdown popover).
 *
 * Compact button reading "Vozidla · vše · N" by default; click opens a
 * popover with check-box rows (one per vehicle). Sits next to the period
 * selector so the two filter controls share one row.
 *
 * Updates `?vehicles=v1,v2` in the URL (empty = all).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Check, ChevronDown } from "lucide-react";
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
  const allSelected = selected.size === 0;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
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
    const next = new Set(selected.size === 0 ? vehicles.map((v) => v.id) : selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const sp = new URLSearchParams(params.toString());
    if (next.size === 0 || next.size === vehicles.length) sp.delete(paramName);
    else sp.set(paramName, [...next].join(","));
    router.replace(`?${sp.toString()}`, { scroll: false });
    // v2.9.10 — refresh re-runs the page's server component so the
    // <StatsDashboard/> re-fetches with the updated `?vehicles=` filter.
    router.refresh();
  }
  function selectAll() {
    const sp = new URLSearchParams(params.toString());
    sp.delete(paramName);
    router.replace(`?${sp.toString()}`, { scroll: false });
    router.refresh();
  }

  if (vehicles.length <= 1) return null;

  const summary = allSelected
    ? `${vehicles.length}`
    : `${selected.size}/${vehicles.length}`;

  // v2.18.1 — match the new GarageMultiSelect chip styling (no big colored
  // ikon-tile + no uppercase label). Active state when not "vše" so the
  // chip itself signals an applied filter.
  const active = !allSelected;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`h-8 inline-flex items-center gap-1.5 rounded-lg border px-2.5 text-xs transition ${
          active
            ? "border-accent/50 bg-accent/10 text-accent dark:bg-accent/15"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
      >
        <Car className="h-3.5 w-3.5 opacity-70" />
        <span className="font-medium">Vozidla</span>
        <span className={`font-semibold tabular-nums ${active ? "" : "text-slate-500 dark:text-slate-400"}`}>
          · {summary}
        </span>
        <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
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
              {allSelected ? `vše vybráno · ${vehicles.length}` : `vybráno ${selected.size}/${vehicles.length}`}
            </span>
            {!allSelected && (
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-accent hover:underline"
              >
                Vybrat vše
              </button>
            )}
          </div>
          <ul className="py-1">
            {vehicles.map((v) => {
              const on = allSelected || selected.has(v.id);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => toggle(v.id)}
                    role="option"
                    aria-selected={on}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <span
                      className={`inline-flex items-center justify-center h-4 w-4 rounded border ${
                        on
                          ? "bg-accent border-accent text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <VehicleAvatar
                      photoPath={v.photo_path}
                      color={v.color}
                      size="sm"
                      className="!w-6 !h-6"
                    />
                    {/* v2.14.5 — small swatch behind the name when the
                        avatar shows a logo (so the colour is also
                        visible at this small size — the avatar ring is
                        only ~2 px). */}
                    {v.color && v.photo_path && (
                      <span
                        aria-hidden
                        className="inline-block w-1 h-4 rounded-sm shrink-0"
                        style={{ backgroundColor: v.color }}
                      />
                    )}
                    <span className="truncate flex-1">{v.name}</span>
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
