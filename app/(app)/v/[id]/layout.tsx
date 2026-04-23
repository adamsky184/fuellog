import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vehicle-scoped layout.
 *
 * Since v2.3.0 the section tabs (Tankování / Statistiky / …) and the
 * vehicle switcher live in the global Header, so this layout only needs to
 * show a lightweight page title for the current car. Keeping the heading
 * here rather than in each child page means every sub-page gets consistent
 * "you are here" context for free.
 */
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

  const subtitle =
    [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ") +
    (vehicle.license_plate ? ` · ${vehicle.license_plate}` : "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-6 w-6 rounded-full border border-slate-200 dark:border-slate-700 shrink-0"
          style={{ backgroundColor: vehicle.color ?? "#e2e8f0" }}
          aria-hidden
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{vehicle.name}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
