import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import {
  AdminTableCard,
  AdminExportButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/components/admin-actions";

type FillUpRow = {
  id: string;
  vehicle_id: string;
  vehicle_name: string | null;
  date: string;
  odometer_km: number | null;
  liters: number | null;
  total_price: number | null;
  currency: string;
  station_brand: string | null;
  city: string | null;
  country: string | null;
  is_full_tank: boolean;
  is_baseline: boolean;
  is_highway: boolean;
  note: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
};

export default async function AdminFillUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; limit?: string }>;
}) {
  const { vehicle, limit } = await searchParams;
  const limitN = Math.min(Math.max(Number(limit) || 500, 50), 5000);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_fill_ups", {
    p_vehicle_id: vehicle ?? null,
    p_limit: limitN,
  });
  const rows = (data ?? []) as FillUpRow[];

  return (
    <AdminTableCard
      title={`Tankování (${rows.length}${
        rows.length === limitN ? `, limit ${limitN}` : ""
      })`}
      toolbar={
        <>
          {vehicle && (
            <Link
              href="/admin/fill-ups"
              className="text-xs text-slate-500 hover:underline"
            >
              Zrušit filtr
            </Link>
          )}
          <AdminExportButton
            rows={rows as unknown as Record<string, unknown>[]}
            filename={
              vehicle
                ? `fuellog-fill-ups-${vehicle.slice(0, 8)}.csv`
                : "fuellog-fill-ups.csv"
            }
          />
        </>
      }
      empty={rows.length === 0}
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <Th>Datum</Th>
            <Th>Vozidlo</Th>
            <Th>Pumpa</Th>
            <Th className="text-right">Tachometr</Th>
            <Th className="text-right">Litry</Th>
            <Th className="text-right">Cena</Th>
            <Th>Místo</Th>
            <Th>Uživatel</Th>
            <Th>Akce</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((f) => (
            <tr key={f.id}>
              <Td className="text-slate-700 dark:text-slate-200">
                {formatDate(f.date)}
                {f.is_baseline && (
                  <span className="ml-1 text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    BASE
                  </span>
                )}
              </Td>
              <Td>
                <Link
                  href={`/v/${f.vehicle_id}/fill-ups`}
                  className="hover:underline"
                >
                  {f.vehicle_name ?? "—"}
                </Link>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  {f.station_brand && (
                    <BrandLogo brand={f.station_brand} size={18} />
                  )}
                  <span>{f.station_brand ?? "—"}</span>
                </div>
              </Td>
              <Td className="text-right tabular-nums">
                {f.odometer_km ? formatNumber(f.odometer_km, 0) : "—"}
              </Td>
              <Td className="text-right tabular-nums">
                {f.liters != null ? formatNumber(f.liters, 2) : "—"}
              </Td>
              <Td className="text-right tabular-nums">
                {formatCurrency(f.total_price, f.currency || "CZK")}
              </Td>
              <Td className="text-slate-500 dark:text-slate-400">
                {[f.city, f.country].filter(Boolean).join(", ") || "—"}
              </Td>
              <Td className="text-slate-500 dark:text-slate-400 max-w-[18ch] truncate">
                {f.created_by_email ?? "—"}
              </Td>
              <Td>
                <div className="flex items-center gap-1 flex-wrap">
                  <AdminEditButton
                    rpc="admin_update_fill_up"
                    idParam="p_fill_up_id"
                    row={f as unknown as Record<string, unknown> & { id: string }}
                    title="Upravit tankování"
                    fields={[
                      { name: "date", label: "Datum", type: "date" },
                      { name: "odometer_km", label: "Tachometr (km)", type: "number" },
                      { name: "liters", label: "Litry", type: "number" },
                      { name: "total_price", label: "Cena", type: "number" },
                      { name: "station_brand", label: "Pumpa", type: "text" },
                      { name: "note", label: "Poznámka", type: "textarea" },
                    ]}
                  />
                  <AdminDeleteButton
                    rpc="admin_delete_fill_up"
                    id={f.id}
                    confirm={`Smazat tankování ${formatDate(f.date)}${
                      f.station_brand ? ` u ${f.station_brand}` : ""
                    }?`}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableCard>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2 text-left font-medium whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2 whitespace-nowrap align-top ${className}`}>{children}</td>
  );
}
