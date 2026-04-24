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

type GarageRow = {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
  vehicle_count: number;
  member_count: number;
};

export default async function AdminGaragesPage() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_garages");
    if (error) throw new Error(`admin_list_garages: ${error.message}`);
    const rows = (data ?? []) as GarageRow[];

    return (
      <AdminTableCard
        title={`Garáže (${rows.length})`}
        toolbar={
          <AdminExportButton
            rows={rows as unknown as Record<string, unknown>[]}
            filename="fuellog-garages.csv"
          />
        }
        empty={rows.length === 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <Th>Název</Th>
              <Th>Popis</Th>
              <Th>Vlastník</Th>
              <Th>Vozidel</Th>
              <Th>Členů</Th>
              <Th>Vytvořeno</Th>
              <Th>Akce</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {rows.map((g) => (
              <tr key={g.id}>
                <Td className="font-medium">{g.name}</Td>
                <Td className="text-slate-600 dark:text-slate-300 max-w-[24ch] truncate">
                  {g.description ?? "—"}
                </Td>
                <Td className="text-slate-500 dark:text-slate-400">
                  {g.owner_email ?? "—"}
                </Td>
                <Td className="tabular-nums">{g.vehicle_count}</Td>
                <Td className="tabular-nums">{g.member_count}</Td>
                <Td className="text-slate-500 dark:text-slate-400">
                  {formatDate(g.created_at)}
                </Td>
                <Td>
                  <div className="flex items-center gap-1 flex-wrap">
                    <AdminEditButton
                      rpc="admin_update_garage"
                      idParam="p_garage_id"
                      row={g as unknown as Record<string, unknown> & { id: string }}
                      title="Upravit garáž"
                      fields={[
                        { name: "name", label: "Název", type: "text" },
                        { name: "description", label: "Popis", type: "textarea" },
                      ]}
                    />
                    <AdminDeleteButton
                      rpc="admin_delete_garage"
                      id={g.id}
                      confirm={`Smazat garáž „${g.name}"? Vozidla zůstanou, ale ztratí zařazení do garáže.`}
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
    console.error("[admin garages] OUTER catch", e);
    return <AdminPageError source="Garáže" e={e} />;
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2 whitespace-nowrap align-top ${className}`}>{children}</td>
  );
}
