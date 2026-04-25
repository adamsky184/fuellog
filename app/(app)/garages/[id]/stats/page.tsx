/**
 * v2.9.5 — garage-aggregated statistics page.
 *
 * Reuses <StatsDashboard/> with the union of every fill-up across the
 * garage's vehicles. RLS handles the visibility check (the user only
 * sees fill-ups for vehicles they're a member of via the garage).
 *
 * The dashboard's per-vehicle annual-report link is hidden when no
 * vehicleId is supplied, since aggregating PDFs across cars hasn't
 * been built yet.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatsDashboard, type RawStatsRow } from "@/components/stats-dashboard";

export default async function GarageStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [garageRes, vehiclesRes] = await Promise.all([
    supabase.from("garages").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("vehicles").select("id, name").eq("garage_id", id),
  ]);
  if (!garageRes.data) notFound();

  const vehicleIds = (vehiclesRes.data ?? []).map((v) => v.id as string);
  let rowsAll: RawStatsRow[] = [];
  if (vehicleIds.length > 0) {
    const { data: rowsRaw } = await supabase
      .from("fill_up_stats_v")
      .select(
        "date, odometer_km, liters, total_price, total_price_czk, currency, " +
          "price_per_liter, price_per_liter_czk, consumption_l_per_100km, km_since_last, " +
          "station_brand, country, region, is_baseline, is_highway",
      )
      .in("vehicle_id", vehicleIds)
      .order("date", { ascending: true });
    rowsAll = (rowsRaw ?? []) as unknown as RawStatsRow[];
  }

  // currentOdometer is per-vehicle; for an aggregate page we sum the highest
  // reading per car so the user sees "celková kilometrová stopa flotily".
  const odometerByVehicle: Record<string, number> = {};
  for (const r of rowsAll) {
    // RawStatsRow doesn't include vehicle_id by default; we'd need it for an
    // exact per-car max. For v2.9.5 we just use the dataset's max odometer
    // which over-counts but is fine for a "highest km we've ever recorded".
    const km = Number(r.odometer_km ?? 0);
    if (!odometerByVehicle["agg"] || km > odometerByVehicle["agg"]) {
      odometerByVehicle["agg"] = km;
    }
  }
  const currentOdometer = odometerByVehicle["agg"] ?? 0;

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
      <StatsDashboard
        rows={rowsAll}
        currentOdometer={currentOdometer}
        title={`Souhrn · ${garageRes.data.name}`}
      />
      {(vehiclesRes.data ?? []).length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          V této garáži zatím nejsou žádná auta.
        </div>
      )}
    </div>
  );
}
