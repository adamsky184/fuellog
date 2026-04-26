/**
 * v2.9.5 → v2.9.6 — garage-aggregated statistics page.
 *
 * - Server-renders <StatsDashboard/> with the union of every fill-up
 *   across the garage's vehicles. RLS handles visibility.
 * - v2.9.6: optional `?vehicles=v1,v2` query parameter narrows the
 *   aggregation to a sub-set of cars. Empty/missing = all garage cars.
 *   Multi-select is rendered as a chip strip via <VehicleMultiSelect/>.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatsDashboard, type RawStatsRow } from "@/components/stats-dashboard";
import { VehicleMultiSelect, type VehicleOption } from "@/components/vehicle-multi-select";
import { fetchAllStatsRows } from "@/lib/fetch-all-stats";

export default async function GarageStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vehicles?: string }>;
}) {
  const { id } = await params;
  const { vehicles: vehiclesParam } = await searchParams;
  const supabase = await createClient();

  const [garageRes, vehiclesRes] = await Promise.all([
    supabase.from("garages").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("vehicles")
      .select("id, name, color, photo_path")
      .eq("garage_id", id)
      .order("name"),
  ]);
  if (!garageRes.data) notFound();

  const allVehicles = (vehiclesRes.data ?? []) as VehicleOption[];
  // Apply the ?vehicles=…,… filter; falsy = all.
  const requested = (vehiclesParam ?? "").split(",").filter(Boolean);
  const allowed = new Set(allVehicles.map((v) => v.id));
  const selectedIds = requested.length > 0
    ? requested.filter((vid) => allowed.has(vid))
    : allVehicles.map((v) => v.id);

  // v2.9.9 — paginated fetch (Supabase has a hard 1000-row PostgREST cap;
  // .range() is silently clamped). fetchAllStatsRows loops pages until
  // every record is in. Without this, "Kč v období" was 0 Kč on the
  // larger PAST garage because only the oldest 1000 rows came back.
  const rowsAll: RawStatsRow[] = await fetchAllStatsRows(supabase, selectedIds);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/vehicles"
          className="text-xs text-slate-500 hover:text-accent inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět na garáže
        </Link>
      </div>
      <StatsDashboard
        rows={rowsAll}
        currentOdometer={0}
        title={`Souhrn · ${garageRes.data.name}${
          selectedIds.length < allVehicles.length
            ? ` (${selectedIds.length}/${allVehicles.length} vozů)`
            : ""
        }`}
        filtersSlot={<VehicleMultiSelect vehicles={allVehicles} />}
      />
      {allVehicles.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          V této garáži zatím nejsou žádná auta.
        </div>
      )}
    </div>
  );
}
