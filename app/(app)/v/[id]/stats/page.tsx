import { createClient } from "@/lib/supabase/server";
import { StatsDashboard } from "@/components/stats-dashboard";
import { fetchAllStatsRowsForVehicle } from "@/lib/fetch-all-stats";

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // v2.9.9 — page through 1000-row chunks; see lib/fetch-all-stats.ts.
  const rowsAll = await fetchAllStatsRowsForVehicle(supabase, id);

  // Current odometer = highest odometer reading (including baseline).
  const currentOdometer = rowsAll.reduce(
    (max, r) => Math.max(max, Number(r.odometer_km ?? 0)),
    0,
  );

  return (
    <StatsDashboard rows={rowsAll} vehicleId={id} currentOdometer={currentOdometer} />
  );
}
