"use client";

/**
 * Compact vehicle switcher in the header.
 *
 *   [●] Name ▾     ← button, truncated, color-dot for the active car
 *        └─ menu grouped by garage:
 *              Garáž A
 *                 ● Octavia   Škoda Octavia 1.6
 *                 ● Fabia     Škoda Fabia
 *              Bez garáže
 *                 ● Motorka   ...
 *              ─────────────────
 *              🏠 Moje garáž
 *
 * The current vehicle is derived from the URL (/v/<id>/...) so a single mount
 * of the Header (in the app layout) always stays in sync with the active page.
 *
 * Design goals (per Adam): decent, clear, compact — not a big fat bar.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Warehouse } from "lucide-react";
import { VehicleAvatar } from "@/components/vehicle-avatar";

export type SwitcherVehicle = {
  id: string;
  name: string;
  color: string | null;
  make: string | null;
  model: string | null;
  garage_id: string | null;
  /** v2.9.0 — optional fields, populated from server when available. */
  photo_path?: string | null;
  first_year?: number | null;
  last_year?: number | null;
  has_recent_fillup?: boolean;
};
export type SwitcherGarage = { id: string; name: string; sort_order?: number | null };

export function VehicleSwitcher({
  vehicles,
  garages,
  currentVehicleId,
}: {
  vehicles: SwitcherVehicle[];
  garages: SwitcherGarage[];
  currentVehicleId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close the menu whenever the URL changes (e.g. user picked a vehicle).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (vehicles.length === 0) return null;

  const current = currentVehicleId
    ? vehicles.find((v) => v.id === currentVehicleId) ?? null
    : null;

  // Group by garage, with null (Bez garáže) last.
  // v2.9.2 — within each group, sort by last_year DESC (newest first), then
  // first_year DESC. Active cars (has_recent_fillup) bubble above archived.
  const byGarage = new Map<string | null, SwitcherVehicle[]>();
  for (const v of vehicles) {
    const key = v.garage_id ?? null;
    const bucket = byGarage.get(key) ?? [];
    bucket.push(v);
    byGarage.set(key, bucket);
  }
  for (const list of byGarage.values()) {
    list.sort((a, b) => {
      const aActive = a.has_recent_fillup ? 1 : 0;
      const bActive = b.has_recent_fillup ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const aLast = a.last_year ?? 0;
      const bLast = b.last_year ?? 0;
      if (aLast !== bLast) return bLast - aLast;
      const aFirst = a.first_year ?? 0;
      const bFirst = b.first_year ?? 0;
      if (aFirst !== bFirst) return bFirst - aFirst;
      return a.name.localeCompare(b.name, "cs");
    });
  }
  // v2.9.0 — honour the per-user `sort_order` from garage_user_settings.
  // Garages without a user-set order fall to the bottom alphabetically;
  // "Bez garáže" always last.
  const groups = Array.from(byGarage.entries()).sort((a, b) => {
    if (a[0] == null) return 1;
    if (b[0] == null) return -1;
    const ga = garages.find((g) => g.id === a[0]);
    const gb = garages.find((g) => g.id === b[0]);
    const oa = ga?.sort_order;
    const ob = gb?.sort_order;
    if (oa != null && ob != null) return oa - ob;
    if (oa != null) return -1;
    if (ob != null) return 1;
    return (ga?.name ?? "").localeCompare(gb?.name ?? "", "cs");
  });

  const label = current?.name ?? "Vyber auto";

  // Where to jump inside a newly-selected vehicle: keep the current sub-page
  // (/fill-ups, /stats, …) when possible so the switcher feels like "same
  // screen, other car" rather than a full reset.
  function hrefFor(id: string): string {
    const m = pathname?.match(/^\/v\/[^/]+(\/[^?#]+)?$/);
    const sub = m?.[1] ?? "/fill-ups";
    // Defensive: never land on an edit route (/fill-ups/:fid/edit) for another car.
    if (sub.includes("/edit")) return `/v/${id}/fill-ups`;
    return `/v/${id}${sub}`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm
          border border-slate-200/70 bg-white/70 hover:bg-slate-50
          dark:border-slate-700/70 dark:bg-slate-800/70 dark:hover:bg-slate-800
          transition min-w-0 max-w-[40vw] sm:max-w-[18ch]"
        title={current ? `Přepnout auto (${current.name})` : "Vyber auto"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <VehicleAvatar
          photoPath={current?.photo_path ?? null}
          color={current?.color ?? null}
          size="sm"
          className="!w-4 !h-4"
        />
        <span className="truncate font-medium">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1.5 w-[min(88vw,20rem)] max-h-[70vh] overflow-auto
            rounded-xl border border-slate-200 bg-white shadow-lg
            dark:bg-slate-900 dark:border-slate-700
            py-1 z-50"
        >
          {groups.map(([gid, list]) => {
            const gname =
              gid == null
                ? "Bez garáže"
                : garages.find((g) => g.id === gid)?.name ?? "Garáž";
            return (
              <div key={gid ?? "none"} className="py-1">
                <div className="px-3 pt-1 pb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                  <Warehouse className="h-3 w-3" />
                  <span className="truncate">{gname}</span>
                </div>
                {list.map((v) => {
                  const active = v.id === currentVehicleId;
                  const subtitle = [v.make, v.model].filter(Boolean).join(" ") || null;
                  // v2.9.0 — year-range badge: "1995–1997" or "2020 –" if last
                  // fill-up was within ~120 days (i.e. still actively driven).
                  const yearRange =
                    v.first_year && v.last_year
                      ? v.has_recent_fillup
                        ? `${v.first_year} –`
                        : v.first_year === v.last_year
                          ? `${v.first_year}`
                          : `${v.first_year}–${v.last_year}`
                      : null;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        router.push(hrefFor(v.id));
                      }}
                      className={`w-full text-left pr-3 py-2 flex items-center gap-2.5 text-sm relative
                        hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                          active ? "bg-slate-50 dark:bg-slate-800" : ""
                        }`}
                      style={{
                        // v2.9.6 — vehicle color as a 3-px left accent bar
                        borderLeft: `3px solid ${v.color ?? "transparent"}`,
                        paddingLeft: "9px",
                      }}
                    >
                      <VehicleAvatar
                        photoPath={v.photo_path ?? null}
                        color={v.color ?? null}
                        size="md"
                        className="!w-7 !h-7"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{v.name}</span>
                          {yearRange && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0 font-normal">
                              {yearRange}
                            </span>
                          )}
                        </span>
                        {subtitle && (
                          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                            {subtitle}
                          </span>
                        )}
                      </span>
                      {active && (
                        <Check className="h-4 w-4 text-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="border-t border-slate-200/70 dark:border-slate-700/70 mt-1 pt-1">
            <Link
              href="/vehicles"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Warehouse className="h-4 w-4 text-slate-400" />
              <span>Moje garáž</span>
            </Link>
            <Link
              href="/vehicles/new"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 text-slate-400" />
              <span>Přidat auto</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
