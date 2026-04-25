/**
 * v2.9.9 — paginated fetch for fill_up_stats_v.
 *
 * Supabase's PostgREST has a `db.max_rows` hard cap (1000 by default for
 * the standard plan) that overrides client-side `.range()`. With Milan's
 * PAST garage at 1714 rows we hit that ceiling on the first request,
 * fetched the OLDEST rows, and saw `total_price=NULL` on every record —
 * which is why "Kč v období" rendered as 0 Kč.
 *
 * This helper loops 1000-row pages until every row is in hand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { RawStatsRow } from "@/components/stats-dashboard";

const COLUMNS =
  "date, odometer_km, liters, total_price, total_price_czk, currency, " +
  "price_per_liter, price_per_liter_czk, consumption_l_per_100km, km_since_last, " +
  "station_brand, country, region, is_baseline, is_highway";

export async function fetchAllStatsRows(
  supabase: SupabaseClient<Database>,
  vehicleIds: string[],
  pageSize = 1000,
): Promise<RawStatsRow[]> {
  if (vehicleIds.length === 0) return [];
  const out: RawStatsRow[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("fill_up_stats_v")
      .select(COLUMNS)
      .in("vehicle_id", vehicleIds)
      .order("date", { ascending: true })
      .range(from, to);
    if (error) {
      console.error("[fetchAllStatsRows] page error", { from, to, error });
      break;
    }
    const rows = (data ?? []) as unknown as RawStatsRow[];
    out.push(...rows);
    if (rows.length < pageSize) break; // last page
    from += pageSize;
    // Safety guard against runaway loops.
    if (from > 200000) break;
  }
  return out;
}

export async function fetchAllStatsRowsForVehicle(
  supabase: SupabaseClient<Database>,
  vehicleId: string,
  pageSize = 1000,
): Promise<RawStatsRow[]> {
  const out: RawStatsRow[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("fill_up_stats_v")
      .select(COLUMNS)
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: true })
      .range(from, to);
    if (error) {
      console.error("[fetchAllStatsRowsForVehicle] page error", { from, to, error });
      break;
    }
    const rows = (data ?? []) as unknown as RawStatsRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 200000) break;
  }
  return out;
}
