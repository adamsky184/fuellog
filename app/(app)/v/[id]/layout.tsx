import Link from "next/link";
import { notFound } from "next/navigation";
import { Droplets, BarChart3, Upload, Settings, Wrench } from "lucide-react";
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
    .select("id, name, make, model, year, license_plate, fuel_type, color")
    .eq("id", id)
    .maybeSingle();

  if (!vehicle) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-6 w-6 rounded-full border border-slate-200 shrink-0"
            style={{ backgroundColor: vehicle.color ?? "#e2e8f0" }}
            aria-hidden
          />
          <div>
            <Link href="/vehicles" className="text-xs text-slate-500 hover:text-slate-800">← Garáž</Link>
            <h1 className="text-2xl font-semibold mt-1">{vehicle.name}</h1>
            <p className="text-sm text-slate-500">
              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
              {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 text-sm border-b border-slate-200 overflow-x-auto">
        <TabLink href={`/v/${id}/fill-ups`} label="Tankování" icon={<Droplets className="h-4 w-4" />} />
        <TabLink href={`/v/${id}/stats`} label="Statistiky" icon={<BarChart3 className="h-4 w-4" />} />
        <TabLink href={`/v/${id}/maintenance`} label="Servis" icon={<Wrench className="h-4 w-4" />} />
        <TabLink href={`/v/${id}/import`} label="Import / Export" icon={<Upload className="h-4 w-4" />} />
        <TabLink href={`/v/${id}/settings`} label="Nastavení" icon={<Settings className="h-4 w-4" />} />
      </nav>

      <div>{children}</div>
    </div>
  );
}

function TabLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-t-lg text-slate-600 hover:text-ink hover:bg-slate-100 inline-flex items-center gap-2 whitespace-nowrap"
    >
      {icon}
      {label}
    </Link>
  );
}
