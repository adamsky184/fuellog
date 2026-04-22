import { createClient } from "@/lib/supabase/server";
import { StatsDashboard, type RawStatsRow } from "@/components/stats-dashboard";

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rowsRaw } = await supabase
    .from("fill_up_stats_v")
    .select(
      "date, odometer_km, liters, total_price, price_per_liter, consumption_l_per_100km, km_since_last, station_brand, country, region, is_baseline, is_highway",
    )
    .eq("vehicle_id", id)
    .order("date", { ascending: true });

  const rowsAll = (rowsRaw ?? []) as RawStatsRow[];

  // Current odometer = highest odometer reading (including baseline).
  const currentOdometer = rowsAll.reduce(
    (max, r) => Math.max(max, Number(r.odometer_km ?? 0)),
    0,
  );

  return (
    <StatsDashboard rows={rowsAll} vehicleId={id} currentOdometer={currentOdometer} />
  );
}
