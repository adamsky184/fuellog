/**
 * v2.9.6 — cross-garage stats.
 *
 * Aggregate fill-ups across multiple garages (or all of them by default).
 * Query params:
 *   ?garages=g1,g2   restrict to selected garage IDs (empty = all)
 *   ?vehicles=v1,v2  further narrow to specific cars
 *
 * RLS automatically filters to garages the user can read.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatsDashboard, type RawStatsRow } from "@/components/stats-dashboard";
import { VehicleMultiSelect, type VehicleOption } from "@/components/vehicle-multi-select";
import { GarageMultiSelect, type GarageOption } from "@/components/garage-multi-select";

export default async function CrossGarageStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ garages?: string; vehicles?: string }>;
}) {
  const { garages: garagesParam, vehicles: vehiclesParam } = await searchParams;
  const supabase = await createClient();

  const [garagesRes, vehiclesRes] = await Promise.all([
    supabase.from("garages").select("id, name").order("name"),
    supabase
      .from("vehicles")
      .select("id, name, color, photo_path, garage_id")
      .order("name"),
  ]);
  const allGarages = (garagesRes.data ?? []) as GarageOption[];
  const allVehiclesUnfiltered = (vehiclesRes.data ?? []) as (VehicleOption & {
    garage_id: string | null;
  })[];

  // Garage filter
  const reqGarages = (garagesParam ?? "").split(",").filter(Boolean);
  const garageIds =
    reqGarages.length > 0
      ? reqGarages.filter((g) => allGarages.some((x) => x.id === g))
      : allGarages.map((g) => g.id);

  const vehiclesInGarages = allVehiclesUnfiltered.filter(
    (v) => v.garage_id != null && garageIds.includes(v.garage_id),
  );

  // Vehicle filter
  const reqVehicles = (vehiclesParam ?? "").split(",").filter(Boolean);
  const allowedVehicleIds = new Set(vehiclesInGarages.map((v) => v.id));
  const selectedIds =
    reqVehicles.length > 0
      ? reqVehicles.filter((vid) => allowedVehicleIds.has(vid))
      : vehiclesInGarages.map((v) => v.id);

  let rowsAll: RawStatsRow[] = [];
  if (selectedIds.length > 0) {
    const { data: rowsRaw } = await supabase
      .from("fill_up_stats_v")
      .select(
        "date, odometer_km, liters, total_price, total_price_czk, currency, " +
          "price_per_liter, price_per_liter_czk, consumption_l_per_100km, km_since_last, " +
          "station_brand, country, region, is_baseline, is_highway",
      )
      .in("vehicle_id", selectedIds)
      .order("date", { ascending: true });
    rowsAll = (rowsRaw ?? []) as unknown as RawStatsRow[];
  }

  const titleSuffix =
    garageIds.length === allGarages.length
      ? "všechny garáže"
      : `${garageIds.length}/${allGarages.length} garáží`;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/vehicles"
          className="text-xs text-slate-500 hover:text-sky-600 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět na garáže
        </Link>
      </div>
      <GarageMultiSelect garages={allGarages} />
      <VehicleMultiSelect vehicles={vehiclesInGarages} />
      <StatsDashboard
        rows={rowsAll}
        currentOdometer={0}
        title={`Souhrn · ${titleSuffix}`}
      />
    </div>
  );
}
