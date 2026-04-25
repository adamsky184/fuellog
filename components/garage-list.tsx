/**
 * v2.9.0 → v2.9.1 — GarageList (client component)
 *
 * Renders the user's garages with their vehicles. v2.9.1 adds:
 *  - sort selector: rok / abc / vlastní (custom drag)
 *  - year-range badge ("1995–1997" / "2020 –") next to each vehicle
 *  - drag-and-drop garage reordering only when sort = "vlastní"
 *
 * Per-user ordering persists in `garage_user_settings`.
 */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  BarChart3,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Move,
  Share2,
  Warehouse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VehicleAvatar } from "@/components/vehicle-avatar";

export type GarageListVehicle = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  fuel_type: string;
  color: string | null;
  garage_id: string | null;
  photo_path: string | null;
  /** Earliest fill-up year (vehicle_date_range_v.first_year). */
  first_year: number | null;
  /** Latest fill-up year. */
  last_year: number | null;
  /** True when last fill-up was within the last ~120 days. */
  has_recent_fillup: boolean;
  /** ISO timestamp; non-null when the user archived this vehicle. */
  archived_at?: string | null;
};

export type GarageListGroup = {
  garage_id: string | null;
  garage_name: string;
  vehicles: GarageListVehicle[];
  /** Used by the "by age, newest first" sort: max last_year across cars. */
  newest_year: number | null;
};

type SortKey = "year" | "abc" | "custom";

const SORT_KEY_STORAGE = "fuellog-garage-sort";

export function GarageList({ groups: initialGroups }: { groups: GarageListGroup[] }) {
  // Persist sort selection across page loads (just a UX nicety).
  const [sortKey, setSortKey] = useState<SortKey>("year");
  useEffect(() => {
    try {
      const v = localStorage.getItem(SORT_KEY_STORAGE);
      if (v === "year" || v === "abc" || v === "custom") setSortKey(v);
    } catch {
      /* ignore */
    }
  }, []);
  function setAndStoreSort(k: SortKey) {
    setSortKey(k);
    try {
      localStorage.setItem(SORT_KEY_STORAGE, k);
    } catch {
      /* ignore */
    }
  }

  const [groups, setGroups] = useState(initialGroups);
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  useEffect(() => setGroups(initialGroups), [initialGroups]);

  // v2.9.5 — per-garage expand/collapse. Default = expanded. State persists
  // in localStorage so the page remembers what the user folded last time.
  const COLLAPSE_KEY = "fuellog-garage-collapsed";
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      if (raw) setCollapsed(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);
  function toggleCollapsed(garageId: string | null) {
    if (!garageId) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(garageId)) next.delete(garageId);
      else next.add(garageId);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Build the displayed order based on sortKey. "Bez garáže" always last.
  const ordered = useMemo(() => {
    const noGarage = groups.find((g) => g.garage_id == null);
    const real = groups.filter((g) => g.garage_id != null);
    const sorted = [...real];
    if (sortKey === "abc") {
      sorted.sort((a, b) => a.garage_name.localeCompare(b.garage_name, "cs"));
    } else if (sortKey === "year") {
      // Newest first: max last_year across the garage's vehicles.
      sorted.sort((a, b) => (b.newest_year ?? 0) - (a.newest_year ?? 0));
    }
    // For "custom", keep the order the parent passed in (already
    // sorted by user's saved sort_order).
    return noGarage ? [...sorted, noGarage] : sorted;
  }, [groups, sortKey]);

  // ----- drag-drop (only meaningful in "custom") -----
  function onDragStart(garageId: string | null) {
    if (sortKey !== "custom") return;
    if (garageId == null) return;
    setDragId(garageId);
  }
  function onDragOver(e: React.DragEvent) {
    if (sortKey === "custom" && dragId) e.preventDefault();
  }
  async function onDrop(targetId: string | null) {
    if (sortKey !== "custom") return;
    if (!dragId || dragId === targetId || targetId == null) {
      setDragId(null);
      return;
    }
    const next = [...groups];
    const fromIdx = next.findIndex((g) => g.garage_id === dragId);
    const toIdx = next.findIndex((g) => g.garage_id === targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDragId(null);
      return;
    }
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setGroups(next);
    setDragId(null);
    setSavingOrder(true);
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (userId) {
      const rows = next
        .filter((g) => g.garage_id != null)
        .map((g, i) => ({
          user_id: userId,
          garage_id: g.garage_id as string,
          sort_order: i,
        }));
      await supabase.from("garage_user_settings").upsert(rows, {
        onConflict: "user_id,garage_id",
      });
    }
    setSavingOrder(false);
  }

  // Within each group, sort vehicles by sortKey too: year (newest first),
  // abc, or by created_at (the order from the server) for "custom".
  function sortedVehicles(vs: GarageListVehicle[]): GarageListVehicle[] {
    if (sortKey === "abc") {
      return [...vs].sort((a, b) => a.name.localeCompare(b.name, "cs"));
    }
    if (sortKey === "year") {
      return [...vs].sort((a, b) => (b.last_year ?? 0) - (a.last_year ?? 0));
    }
    return vs;
  }

  return (
    <div className="space-y-5">
      {/* Sort selector */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-500 dark:text-slate-400 mr-1">Řadit:</span>
        <SortChip
          active={sortKey === "year"}
          onClick={() => setAndStoreSort("year")}
          icon={<CalendarRange className="h-3.5 w-3.5" />}
        >
          dle stáří
        </SortChip>
        <SortChip
          active={sortKey === "abc"}
          onClick={() => setAndStoreSort("abc")}
          icon={<ArrowDownAZ className="h-3.5 w-3.5" />}
        >
          abecedně
        </SortChip>
        <SortChip
          active={sortKey === "custom"}
          onClick={() => setAndStoreSort("custom")}
          icon={<Move className="h-3.5 w-3.5" />}
        >
          vlastní
        </SortChip>
      </div>

      {ordered.map((group) => {
        const isReal = group.garage_id != null;
        const isDraggingMe = sortKey === "custom" && dragId === group.garage_id;
        const isDropTarget =
          sortKey === "custom" && dragId && dragId !== group.garage_id && isReal;
        return (
          <section
            key={group.garage_id ?? "none"}
            draggable={sortKey === "custom" && isReal}
            onDragStart={() => onDragStart(group.garage_id)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(group.garage_id)}
            className={`space-y-3 rounded-2xl transition ${
              isDraggingMe ? "opacity-50" : ""
            } ${isDropTarget ? "ring-2 ring-sky-400/50 ring-offset-2 ring-offset-transparent" : ""}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {sortKey === "custom" && isReal && (
                <GripVertical
                  className="h-4 w-4 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing"
                  aria-label="Přetáhni pro změnu pořadí"
                />
              )}
              {/* v2.9.5 — chevron toggles collapse for real garages. */}
              {isReal ? (
                <button
                  type="button"
                  onClick={() => toggleCollapsed(group.garage_id)}
                  className="inline-flex items-center gap-2 hover:text-sky-600 transition"
                  aria-expanded={!collapsed.has(group.garage_id ?? "")}
                  aria-controls={`garage-${group.garage_id}`}
                >
                  {collapsed.has(group.garage_id ?? "") ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                  <Warehouse className="h-4 w-4 text-slate-400" />
                  <span>{group.garage_name}</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-slate-400" />
                  <span>{group.garage_name}</span>
                </span>
              )}
              <span className="text-xs text-slate-400 font-normal">
                · {group.vehicles.length}{" "}
                {group.vehicles.length === 1
                  ? "vozidlo"
                  : group.vehicles.length < 5
                    ? "vozidla"
                    : "vozidel"}
              </span>
              {savingOrder && isDraggingMe && (
                <span className="text-xs text-slate-400 font-normal">· ukládám…</span>
              )}
              {/* Action chips: stats / share. Only on real garages. */}
              {isReal && (
                <span className="ml-auto inline-flex items-center gap-1">
                  <Link
                    href={`/garages/${group.garage_id}/stats`}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-sky-600 px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-sky-950/30 transition"
                    title="Souhrnné statistiky garáže"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline font-normal">Statistiky</span>
                  </Link>
                  <Link
                    href={`/garages#g-${group.garage_id}`}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-sky-600 px-2 py-0.5 rounded hover:bg-sky-50 dark:hover:bg-sky-950/30 transition"
                    title="Sdílet / nastavení garáže"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline font-normal">Sdílet</span>
                  </Link>
                </span>
              )}
            </div>

            {!collapsed.has(group.garage_id ?? "__none__") && (
            <ul id={`garage-${group.garage_id}`} className="grid gap-3 sm:grid-cols-2">
              {sortedVehicles(group.vehicles).map((v) => {
                const yearRange = formatYearRange(v);
                // v2.9.11 — color stripe rendered as an absolutely-positioned
                //   pseudo bar inset 8 px from top + bottom of the card so it
                //   doesn't fight the rounded corners. Card itself loses
                //   overflow-hidden so the inner rounded corners + hover bg
                //   remain clean. Plus `line-clamp-1` on the name + `min-h`
                //   on the row so all cards in the same grid row line up
                //   regardless of name length.
                return (
                  <li key={v.id} className="card flex relative">
                    {v.color && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                        style={{ backgroundColor: v.color }}
                      />
                    )}
                    <Link
                      href={`/v/${v.id}/fill-ups`}
                      className="flex-1 block p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-h-[68px]">
                        <VehicleAvatar photoPath={v.photo_path} color={v.color} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base sm:text-lg truncate">
                              {v.name}
                            </span>
                            {yearRange && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0 font-normal">
                                {yearRange}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 truncate">
                            {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide truncate">
                            {v.license_plate || ""} · {v.fuel_type}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SortChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition ${
        active
          ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function formatYearRange(v: GarageListVehicle): string | null {
  const fy = v.first_year;
  const ly = v.last_year;
  if (!fy && !ly) return v.year ? String(v.year) : null;
  if (fy && ly) {
    if (v.has_recent_fillup) return `${fy} –`;
    if (fy === ly) return String(fy);
    return `${fy}–${ly}`;
  }
  return null;
}
