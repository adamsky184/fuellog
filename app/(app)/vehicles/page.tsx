import Link from "next/link";
import { ArrowLeftRight, BarChart3, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DueReminders } from "@/components/due-reminders";
import { GarageList, type GarageListGroup, type GarageListVehicle } from "@/components/garage-list";
import { GarageManager } from "@/components/garage-manager";
import { DashboardHero } from "@/components/dashboard-hero";

type VehicleRow = {
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
  archived_at: string | null;
};

type GarageRow = { id: string; name: string; description: string | null };

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ garage?: string }>;
}) {
  const { garage: garageFilter } = await searchParams;

  const supabase = await createClient();

  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;

  const [vehRes, garRes, settingsRes, dateRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, name, make, model, year, license_plate, fuel_type, color, garage_id, photo_path, archived_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("garages").select("id, name, description").order("created_at", { ascending: true }),
    userId
      ? supabase
          .from("garage_user_settings")
          .select("garage_id, sort_order")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase.from("vehicle_date_range_v").select("vehicle_id, first_year, last_year, last_date"),
  ]);

  const vehicles: VehicleRow[] = vehRes.data ?? [];
  const garages: GarageRow[] = garRes.data ?? [];
  const orderRows = (settingsRes.data ?? []) as { garage_id: string; sort_order: number }[];
  const orderMap = new Map(orderRows.map((r) => [r.garage_id, r.sort_order]));
  const dateMap = new Map<string, { first_year: number | null; last_year: number | null; last_date: string | null }>();
  for (const r of (dateRes.data ?? []) as { vehicle_id: string; first_year: number | null; last_year: number | null; last_date: string | null }[]) {
    dateMap.set(r.vehicle_id, { first_year: r.first_year, last_year: r.last_year, last_date: r.last_date });
  }
  const today = new Date();

  const shown = garageFilter
    ? vehicles.filter((v) =>
        garageFilter === "none" ? !v.garage_id : v.garage_id === garageFilter,
      )
    : vehicles;

  // Build per-garage groups; carry first_year/last_year/has_recent flags onto each vehicle.
  const byGarage = new Map<string | null, GarageListVehicle[]>();
  for (const v of shown) {
    const meta = dateMap.get(v.id);
    const lastDate = meta?.last_date ? new Date(meta.last_date) : null;
    const archived = !!v.archived_at;
    // Archived → never show "still driving"; instead clamp the year-range to
    // archived_at's year if it's later than the last fill-up.
    const recent = !archived && lastDate
      ? today.getTime() - lastDate.getTime() < 120 * 24 * 60 * 60 * 1000
      : false;
    const archivedYear = v.archived_at ? new Date(v.archived_at).getFullYear() : null;
    const lastYear = archivedYear != null
      ? Math.max(meta?.last_year ?? 0, archivedYear) || archivedYear
      : meta?.last_year ?? null;
    const veh: GarageListVehicle = {
      id: v.id,
      name: v.name,
      make: v.make,
      model: v.model,
      year: v.year,
      license_plate: v.license_plate,
      fuel_type: v.fuel_type,
      color: v.color,
      garage_id: v.garage_id,
      photo_path: v.photo_path,
      first_year: meta?.first_year ?? null,
      last_year: lastYear,
      has_recent_fillup: recent,
      archived_at: v.archived_at,
    };
    const key = v.garage_id ?? null;
    const bucket = byGarage.get(key) ?? [];
    bucket.push(veh);
    byGarage.set(key, bucket);
  }

  const garageName = (id: string | null) => {
    if (id == null) return "Bez garáže";
    return garages.find((g) => g.id === id)?.name ?? "Neznámá garáž";
  };

  // Build groups and pre-sort by user's saved order (used as the initial
  // "vlastní" view; client can flip to year/abc).
  const groups: GarageListGroup[] = Array.from(byGarage.entries())
    .map(([gid, list]) => {
      const newest = list.reduce<number | null>(
        (acc, v) => (v.last_year != null && (acc == null || v.last_year > acc) ? v.last_year : acc),
        null,
      );
      return {
        garage_id: gid,
        garage_name: garageName(gid),
        vehicles: list,
        newest_year: newest,
      };
    })
    .sort((a, b) => {
      if (a.garage_id == null) return 1;
      if (b.garage_id == null) return -1;
      const oa = orderMap.get(a.garage_id);
      const ob = orderMap.get(b.garage_id);
      if (oa != null && ob != null) return oa - ob;
      if (oa != null) return -1;
      if (ob != null) return 1;
      return a.garage_name.localeCompare(b.garage_name, "cs");
    });

  const activeFilter = garageFilter
    ? garageFilter === "none"
      ? "Bez garáže"
      : garages.find((g) => g.id === garageFilter)?.name
    : null;

  // v2.10.0 — fleet-age summary. Surfaces vehicles.year (which until now
  // was only used cosmetically). We only show it when at least 2 vehicles
  // have a year filled in, otherwise the average is meaningless.
  const fleetSummary = (() => {
    const yearsList = vehicles
      .filter((v) => !v.archived_at && v.year && v.year >= 1900)
      .map((v) => v.year as number);
    if (yearsList.length < 2) return null;
    const nowY = new Date().getFullYear();
    const ages = yearsList.map((y) => nowY - y);
    const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
    const oldest = Math.max(...ages);
    const newest = Math.min(...ages);
    const total = vehicles.filter((v) => !v.archived_at).length;
    const filled = yearsList.length;
    return {
      total,
      filled,
      missing: total - filled,
      avg,
      oldest,
      newest,
    };
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-tight">Moje garáže</h1>
          <p className="text-slate-500 text-sm">
            {vehicles.length
              ? `${vehicles.length} ${vehicles.length === 1 ? "auto" : vehicles.length < 5 ? "auta" : "aut"}`
              : "Zatím žádná auta"}
            {activeFilter && (
              <>
                {" "}· filtr: <span className="font-medium">{activeFilter}</span>{" "}
                <Link href="/vehicles" className="text-xs underline text-slate-400 hover:text-slate-600">
                  (zrušit)
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {/* v2.9.6 — quick link to cross-garage stats. */}
          {garages.length > 1 && (
            <Link
              href="/garages/stats"
              className="btn-secondary inline-flex items-center gap-1 text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              Souhrn všech
            </Link>
          )}
          {/* v2.12.0 — vehicle comparison page. */}
          {vehicles.length > 1 && (
            <Link
              href="/compare"
              className="btn-secondary inline-flex items-center gap-1 text-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Porovnat
            </Link>
          )}
          <Link href="/vehicles/new" className="btn-primary inline-flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Přidat auto
          </Link>
        </div>
      </div>

      {/* v2.13.0 — premium hero card with last 30d totals + delta. */}
      <DashboardHero />

      <DueReminders />

      {/* v2.10.0 — fleet-age summary. Only renders when at least two
          vehicles have a `year` filled in. Soft-pushes to fill in missing
          years when some are blank. */}
      {fleetSummary && !activeFilter && (
        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <span className="text-slate-400">Park:</span>{" "}
            <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
              {fleetSummary.total}
            </span>{" "}
            {fleetSummary.total === 1 ? "vůz" : fleetSummary.total < 5 ? "vozy" : "vozů"}
          </span>
          <span>
            <span className="text-slate-400">Průměrné stáří:</span>{" "}
            <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
              {fleetSummary.avg.toFixed(1)} let
            </span>
          </span>
          <span>
            <span className="text-slate-400">Nejstarší:</span>{" "}
            <span className="tabular-nums">{fleetSummary.oldest} let</span>
          </span>
          <span>
            <span className="text-slate-400">Nejnovější:</span>{" "}
            <span className="tabular-nums">
              {fleetSummary.newest === 0 ? "letošní" : `${fleetSummary.newest} let`}
            </span>
          </span>
          {fleetSummary.missing > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              · {fleetSummary.missing} {fleetSummary.missing === 1 ? "vůz" : "vozů"} bez ročníku
            </span>
          )}
        </div>
      )}

      {/* v2.9.2 — inline garage CRUD so users don't have to hop to /garages
          for the basics (rename, create, delete). Sharing & members still
          live on /garages. */}
      {garages.length > 0 || vehicles.length === 0 ? (
        <GarageManager
          initialGarages={garages.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            vehicle_count: vehicles.filter((v) => v.garage_id === g.id).length,
          }))}
        />
      ) : null}

      {!shown.length ? (
        <div className="card p-8 text-center space-y-4">
          <p className="text-slate-500">
            {vehicles.length === 0
              ? "Začni přidáním prvního auta."
              : "V tomto filtru nejsou žádná auta."}
          </p>
          <Link href="/vehicles/new" className="btn-primary">
            Přidat auto
          </Link>
        </div>
      ) : (
        <GarageList groups={groups} />
      )}
    </div>
  );
}
