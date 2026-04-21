import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, fuel_type, color")
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
        <Link href="/vehicles/new" className="btn-primary inline-flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Přidat auto
        </Link>
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
      )}
    </div>
  );
}
