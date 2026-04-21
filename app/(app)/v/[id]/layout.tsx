import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function VehicleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, fuel_type")
    .eq("id", id)
    .maybeSingle();

  if (!vehicle) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/vehicles" className="text-xs text-slate-500 hover:text-slate-800">← Garáž</Link>
          <h1 className="text-2xl font-semibold mt-1">{vehicle.name}</h1>
          <p className="text-sm text-slate-500">
            {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
            {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}
          </p>
        </div>
      </div>

      <nav className="flex gap-1 text-sm border-b border-slate-200">
        <TabLink href={`/v/${id}/fill-ups`} label="Tankování" />
        <TabLink href={`/v/${id}/stats`} label="Statistiky" />
        <TabLink href={`/v/${id}/import`} label="Import z xlsx" />
      </nav>

      <div>{children}</div>
    </div>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-t-lg text-slate-600 hover:text-ink hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}
