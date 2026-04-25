/**
 * v2.9.0 — GarageList (client component)
 *
 * Renders the user's garages with their vehicles and lets the user
 * reorder garages by drag-and-drop. The order is persisted per user in
 * `garage_user_settings(user_id, garage_id, sort_order)` so each member
 * of a shared garage keeps their own preference.
 *
 * The vehicle switcher in the header reads the same table, so the
 * switcher list reflects the same custom order.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GripVertical, Warehouse } from "lucide-react";
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
};

export type GarageListGroup = {
  garage_id: string | null; // null = "Bez garáže"
  garage_name: string;
  vehicles: GarageListVehicle[];
};

export function GarageList({ groups: initialGroups }: { groups: GarageListGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // Re-sync when server props change (after a router.refresh).
  useEffect(() => setGroups(initialGroups), [initialGroups]);

  function onDragStart(garageId: string | null) {
    if (garageId == null) return; // "Bez garáže" can't be reordered
    setDragId(garageId);
  }
  function onDragOver(e: React.DragEvent) {
    if (dragId) e.preventDefault();
  }
  async function onDrop(targetId: string | null) {
    if (!dragId || dragId === targetId || targetId == null) {
      setDragId(null);
      return;
    }
    // Reorder in local state.
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

    // Persist new order — write sort_order = index for every real garage.
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

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const isReal = group.garage_id != null;
        const isDraggingMe = dragId === group.garage_id;
        const isDropTarget = dragId && dragId !== group.garage_id && isReal;
        return (
          <section
            key={group.garage_id ?? "none"}
            draggable={isReal}
            onDragStart={() => onDragStart(group.garage_id)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(group.garage_id)}
            className={`space-y-3 rounded-2xl transition ${
              isDraggingMe ? "opacity-50" : ""
            } ${isDropTarget ? "ring-2 ring-sky-400/50 ring-offset-2 ring-offset-transparent" : ""}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isReal && (
                <GripVertical
                  className="h-4 w-4 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing"
                  aria-label="Přetáhni pro změnu pořadí"
                />
              )}
              <Warehouse className="h-4 w-4 text-slate-400" />
              <span>{group.garage_name}</span>
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
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {group.vehicles.map((v) => (
                <li key={v.id} className="card">
                  <Link
                    href={`/v/${v.id}/fill-ups`}
                    className="block p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <VehicleAvatar photoPath={v.photo_path} color={v.color} size="lg" />
                      <div className="min-w-0">
                        <div className="font-semibold text-lg truncate">{v.name}</div>
                        <div className="text-sm text-slate-500 truncate">
                          {[v.make, v.model, v.year].filter(Boolean).join(" ") || "—"}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wide truncate">
                          {v.license_plate || ""} · {v.fuel_type}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
