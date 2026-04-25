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

  let rowsAll: RawStatsRow[] = [];
  if (selectedIds.length > 0) {
    // v2.9.7 — bump beyond PostgREST's default 1000-row cap. With 10 cars
    // × 1700+ fill-ups in Milan's "PAST" garage we'd hit the cap on the
    // OLDEST records (date asc), which all happen to have total_price=NULL
    // — that's why "Kč v období" was reading as 0 Kč. .range() forces the
    // server to return up to the explicit upper bound.
    const { data: rowsRaw } = await supabase
      .from("fill_up_stats_v")
      .select(
        "date, odometer_km, liters, total_price, total_price_czk, currency, " +
          "price_per_liter, price_per_liter_czk, consumption_l_per_100km, km_since_last, " +
          "station_brand, country, region, is_baseline, is_highway",
      )
      .in("vehicle_id", selectedIds)
      .order("date", { ascending: true })
      .range(0, 99999);
    rowsAll = (rowsRaw ?? []) as unknown as RawStatsRow[];
  }

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
      <VehicleMultiSelect vehicles={allVehicles} />
      <StatsDashboard
        rows={rowsAll}
        currentOdometer={0}
        title={`Souhrn · ${garageRes.data.name}${
          selectedIds.length < allVehicles.length
            ? ` (${selectedIds.length}/${allVehicles.length} vozů)`
            : ""
        }`}
      />
      {allVehicles.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          V této garáži zatím nejsou žádná auta.
        </div>
      )}
    </div>
  );
}
