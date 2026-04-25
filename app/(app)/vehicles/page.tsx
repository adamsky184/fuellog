import Link from "next/link";
import { Plus, Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DueReminders } from "@/components/due-reminders";

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
};

type GarageRow = { id: string; name: string; description: string | null };

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ garage?: string }>;
}) {
  const { garage: garageFilter } = await searchParams;

  const supabase = await createClient();

  const [vehRes, garRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, name, make, model, year, license_plate, fuel_type, color, garage_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("garages")
      .select("id, name, description")
      .order("created_at", { ascending: true }),
  ]);

  const vehicles: VehicleRow[] = vehRes.data ?? [];
  const garages: GarageRow[] = garRes.data ?? [];

  // Optional filter by single garage
  const shown = garageFilter
    ? vehicles.filter((v) => (garageFilter === "none" ? !v.garage_id : v.garage_id === garageFilter))
    : vehicles;

  // Group by garage for display
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

  const sortedGroups = Array.from(byGarage.entries()).sort((a, b) => {
    // null (Bez garáže) goes last
    if (a[0] == null) return 1;
    if (b[0] == null) return -1;
    return garageName(a[0]).localeCompare(garageName(b[0]), "cs");
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
          <Link href="/vehicles/new" className="btn-primary">Přidat auto</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([gid, list]) => (
            <section key={gid ?? "none"} className="space-y-3">
              {(garages.length > 0 || gid != null) && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Warehouse className="h-4 w-4 text-slate-400" />
                  <span>{garageName(gid)}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    · {list.length} {list.length === 1 ? "vozidlo" : list.length < 5 ? "vozidla" : "vozidel"}
                  </span>
                </div>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((v) => (
                  <li key={v.id} className="card">
                    <Link href={`/v/${v.id}/fill-ups`} className="block p-5 hover:bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-5 w-5 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: v.color ?? "#e2e8f0" }}
                          aria-hidden
                        />
                        <div className="font-semibold text-lg">{v.name}</div>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {[v.make, v.model, v.year].filter(Boolean).join(" ") || "—"}
                      </div>
                      <div className="text-xs text-slate-400 mt-2 uppercase tracking-wide">
                        {v.license_plate || ""} · {v.fuel_type}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
