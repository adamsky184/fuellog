import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, fuel_type")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Moje garáž</h1>
          <p className="text-slate-500 text-sm">
            {vehicles?.length
              ? `${vehicles.length} ${vehicles.length === 1 ? "auto" : vehicles.length < 5 ? "auta" : "aut"}`
              : "Zatím žádná auta"}
          </p>
        </div>
        <Link href="/vehicles/new" className="btn-primary">+ Přidat auto</Link>
      </div>

      {!vehicles?.length ? (
        <div className="card p-8 text-center space-y-4">
          <p className="text-slate-500">Začni přidáním prvního auta.</p>
          <Link href="/vehicles/new" className="btn-primary">Přidat auto</Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <li key={v.id} className="card">
              <Link href={`/v/${v.id}/fill-ups`} className="block p-5 hover:bg-slate-50 rounded-2xl">
                <div className="font-semibold text-lg">{v.name}</div>
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
      )}
    </div>
  );
}
