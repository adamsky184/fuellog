import Link from "next/link";
import { Plus, Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DueReminders } from "@/components/due-reminders";
import { GarageList, type GarageListGroup } from "@/components/garage-list";

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

  const [vehRes, garRes, settingsRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, name, make, model, year, license_plate, fuel_type, color, garage_id, photo_path",
      )
      .order("created_at", { ascending: false }),
    supabase.from("garages").select("id, name, description").order("created_at", { ascending: true }),
    userId
      ? supabase
          .from("garage_user_settings")
          .select("garage_id, sort_order")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
  ]);

  const vehicles: VehicleRow[] = vehRes.data ?? [];
  const garages: GarageRow[] = garRes.data ?? [];
  const orderRows = (settingsRes.data ?? []) as { garage_id: string; sort_order: number }[];
  const orderMap = new Map(orderRows.map((r) => [r.garage_id, r.sort_order]));

  // Optional filter by single garage
  const shown = garageFilter
    ? vehicles.filter((v) =>
        garageFilter === "none" ? !v.garage_id : v.garage_id === garageFilter,
      )
    : vehicles;

  // Group by garage
  const byGarage = new Map<string | null, VehicleRow[]>();
  for (const v of shown) {
    const key = v.garage_id ?? null;
    const bucket = byGarage.get(key) ?? [];
    bucket.push(v);
    byGarage.set(key, bucket);
  }

  const garageName = (id: string | null) => {
    if (id == null) return "Bez garáže";
    return garages.find((g) => g.id === id)?.name ?? "Neznámá garáž";
  };

  // v2.9.0 — sort by user's chosen `sort_order`. Garages without a user
  // ordering fall to the bottom in alphabetical order. "Bez garáže" always last.
  const groups: GarageListGroup[] = Array.from(byGarage.entries())
    .map(([gid, list]) => ({
      garage_id: gid,
      garage_name: garageName(gid),
      vehicles: list,
    }))
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Moje garáž</h1>
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
          <Link href="/garages" className="btn-secondary inline-flex items-center gap-1">
            <Warehouse className="h-4 w-4" />
            Garáže
          </Link>
          <Link href="/vehicles/new" className="btn-primary inline-flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Přidat auto
          </Link>
        </div>
      </div>

      {/* v2.7.0 — overdue / upcoming maintenance reminders across all vehicles. */}
      <DueReminders />

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
