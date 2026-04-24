import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  AdminTableCard,
  AdminExportButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/components/admin-actions";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { rethrowIfNextInternal } from "@/lib/next-errors";

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
  /** v2.5.0 — admin-only per-vehicle auto-forward setting. */
  forward_receipts_to_email: string | null;
  created_at: string;
  updated_at: string;
  fill_up_count: number;
  last_fill_up_at: string | null;
};

export default async function AdminVehiclesPage() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_vehicles");
    if (error) throw new Error(`admin_list_vehicles: ${error.message}`);
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
              <Th>Forward →</Th>
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
                <Td
                  className="text-xs text-slate-600 dark:text-slate-300"
                  title={
                    v.forward_receipts_to_email
                      ? `Každá účtenka se přepošle na ${v.forward_receipts_to_email}`
                      : "Přeposílání vypnuté"
                  }
                >
                  {v.forward_receipts_to_email ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate max-w-[14rem]">
                        {v.forward_receipts_to_email}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
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
                        {
                          name: "forward_receipts_to_email",
                          label: "Forward účtenek na e-mail (prázdné = vypnuto)",
                          type: "text",
                        },
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
  } catch (e) {
    rethrowIfNextInternal(e);
    console.error("[admin vehicles] OUTER catch", e);
    return <AdminPageError source="Vozidla" e={e} />;
  }
}

function AdminPageError({ source, e }: { source: string; e: unknown }) {
  const msg = e instanceof Error ? e.message : String(e);
  const stack = e instanceof Error ? e.stack : null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
        <AlertTriangle className="h-5 w-5" />
        <h1 className="text-xl font-semibold">{source} — chyba načítání</h1>
      </div>
      <div className="card p-4 space-y-2 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900">
        <p className="text-sm">
          <span className="font-semibold">Chyba:</span>{" "}
          <span className="whitespace-pre-wrap break-words">{msg}</span>
        </p>
        {stack && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
              Stack trace
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-slate-700 dark:text-slate-300">
              {stack}
            </pre>
          </details>
        )}
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          FuelLog v{APP_VERSION}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/api/admin-probe"
          prefetch={false}
          className="btn-primary text-sm inline-flex items-center gap-1"
        >
          <Stethoscope className="h-4 w-4" />
          Spustit diagnostiku
        </Link>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>;
}
function Td({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td
      className={`px-3 py-2 whitespace-nowrap align-top ${className}`}
      title={title}
    >
      {children}
    </td>
  );
}
