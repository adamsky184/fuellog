import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  AdminTableCard,
  AdminExportButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/components/admin-actions";

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
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_garages");
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
