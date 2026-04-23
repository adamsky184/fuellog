import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  AdminTableCard,
  AdminExportButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/components/admin-actions";

type VehicleRow = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  fuel_type: string | null;
  color: string | null;
  garage_id: string | null;
  garage_name: string | null;
  created_by: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
  fill_up_count: number;
  last_fill_up_at: string | null;
};

export default async function AdminVehiclesPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_vehicles");
  const rows = (data ?? []) as VehicleRow[];

  return (
    <AdminTableCard
      title={`Vozidla (${rows.length})`}
      toolbar={
        <AdminExportButton
          rows={rows as unknown as Record<string, unknown>[]}
          filename="fuellog-vehicles.csv"
        />
      }
      empty={rows.length === 0}
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <Th>Vozidlo</Th>
            <Th>Typ</Th>
            <Th>RZ</Th>
            <Th>Garáž</Th>
            <Th>Vlastník</Th>
            <Th>Tankování</Th>
            <Th>Poslední</Th>
            <Th>Vytvořeno</Th>
            <Th>Akce</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((v) => (
            <tr key={v.id}>
              <Td>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                    style={{ backgroundColor: v.color ?? "#cbd5e1" }}
                    aria-hidden
                  />
                  <Link
                    href={`/v/${v.id}/fill-ups`}
                    className="font-medium truncate hover:underline"
                    title={v.name}
                  >
                    {v.name}
                  </Link>
                </div>
              </Td>
              <Td className="text-slate-600 dark:text-slate-300">
                {[v.make, v.model, v.year].filter(Boolean).join(" ") || "—"}
              </Td>
              <Td className="text-slate-500 dark:text-slate-400 uppercase">
                {v.license_plate ?? "—"}
              </Td>
              <Td className="text-slate-600 dark:text-slate-300">
                {v.garage_name ?? "—"}
              </Td>
              <Td className="text-slate-500 dark:text-slate-400">
                {v.owner_email ?? "—"}
              </Td>
              <Td className="tabular-nums">{v.fill_up_count}</Td>
              <Td className="text-slate-500 dark:text-slate-400">
                {v.last_fill_up_at ? formatDate(v.last_fill_up_at) : "—"}
              </Td>
              <Td className="text-slate-500 dark:text-slate-400">
                {formatDate(v.created_at)}
              </Td>
              <Td>
                <div className="flex items-center gap-1 flex-wrap">
                  <AdminEditButton
                    rpc="admin_update_vehicle"
                    idParam="p_vehicle_id"
                    row={v as unknown as Record<string, unknown> & { id: string }}
                    title={`Upravit ${v.name}`}
                    fields={[
                      { name: "name", label: "Název", type: "text" },
                      { name: "make", label: "Značka", type: "text" },
                      { name: "model", label: "Model", type: "text" },
                      { name: "year", label: "Rok", type: "number" },
                      { name: "license_plate", label: "RZ", type: "text" },
                      { name: "color", label: "Barva (#hex)", type: "text" },
                      { name: "garage_id", label: "Garage ID", type: "text" },
                    ]}
                  />
                  <Link
                    href={`/admin/fill-ups?vehicle=${v.id}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Zobrazit tankování"
                  >
                    Tankování →
                  </Link>
                  <AdminDeleteButton
                    rpc="admin_delete_vehicle"
                    id={v.id}
                    confirm={`Smazat vozidlo „${v.name}" včetně všech ${v.fill_up_count} tankování? Tato akce je nevratná.`}
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>;
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
