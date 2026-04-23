import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  AdminTableCard,
  AdminExportButton,
  AdminDeleteButton,
  AdminToggleButton,
  AdminEditButton,
} from "@/components/admin-actions";
import { ShieldCheck } from "lucide-react";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  vehicle_count: number;
  garage_count: number;
  fill_up_count: number;
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_users");
  const rows = (data ?? []) as UserRow[];

  return (
    <AdminTableCard
      title={`Uživatelé (${rows.length})`}
      toolbar={
        <AdminExportButton
          rows={rows as unknown as Record<string, unknown>[]}
          filename="fuellog-users.csv"
        />
      }
      empty={rows.length === 0}
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <Th>E-mail</Th>
            <Th>Jméno</Th>
            <Th>Garáží</Th>
            <Th>Vozidel</Th>
            <Th>Tankování</Th>
            <Th>Registrován</Th>
            <Th>Akce</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((u) => (
            <tr key={u.id}>
              <Td>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-medium">{u.email ?? "—"}</span>
                  {u.is_admin && (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      title="Admin"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      ADMIN
                    </span>
                  )}
                </div>
              </Td>
              <Td>{u.display_name ?? "—"}</Td>
              <Td className="tabular-nums">{u.garage_count}</Td>
              <Td className="tabular-nums">{u.vehicle_count}</Td>
              <Td className="tabular-nums">{u.fill_up_count}</Td>
              <Td className="text-slate-500 dark:text-slate-400">
                {formatDate(u.created_at)}
              </Td>
              <Td>
                <div className="flex items-center gap-1 flex-wrap">
                  <AdminEditButton
                    rpc="admin_update_profile"
                    idParam="p_user_id"
                    row={u as unknown as Record<string, unknown> & { id: string }}
                    title="Upravit profil"
                    fields={[
                      { name: "display_name", label: "Jméno", type: "text" },
                      { name: "avatar_url", label: "Avatar URL", type: "text" },
                    ]}
                  />
                  <AdminToggleButton userId={u.id} isAdmin={u.is_admin} />
                  <AdminDeleteButton
                    rpc="admin_delete_user"
                    id={u.id}
                    confirm={`Smazat uživatele ${u.email ?? u.id}? Smaže i všechny jeho garáže, vozidla a tankování. Tato akce je nevratná.`}
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
