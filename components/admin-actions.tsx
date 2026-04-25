"use client";

/**
 * Admin action primitives reused by all admin resource pages.
 *
 *   <AdminDeleteButton rpc="admin_delete_user" id={u.id} label="uživatele" />
 *   <AdminExportButton rows={rows} filename="users.csv" />
 *   <AdminEditButton resource={{ kind: "vehicle", ... }} />
 *
 * All mutations go through SECURITY DEFINER RPCs gated by is_admin() on the
 * server — the client-side UI is only a convenience layer.
 */

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download, Pencil, X, Save, AlertTriangle, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* -------------------------- CSV export ----------------------------------- */

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set()),
  );
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

export function AdminExportButton({
  rows,
  filename,
  label = "Export CSV",
}: {
  rows: Record<string, unknown>[];
  filename: string;
  label?: string;
}) {
  function download() {
    const csv = toCsv(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      type="button"
      onClick={download}
      className="btn-secondary text-xs inline-flex items-center gap-1"
      title={`Stáhnout ${filename}`}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* -------------------------- Delete -------------------------------------- */

type DeleteRpc =
  | "admin_delete_user"
  | "admin_delete_garage"
  | "admin_delete_vehicle"
  | "admin_delete_fill_up";

export function AdminDeleteButton({
  rpc,
  id,
  confirm,
}: {
  rpc: DeleteRpc;
  id: string;
  /** Confirmation sentence — shown in a native confirm dialog. */
  confirm: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!window.confirm(confirm)) return;
    setError(null);
    const supabase = createClient();
    // v2.10.0 — supabase-js types each RPC's args individually, so we
    //   branch on the rpc name to satisfy the typed signature.
    const { error } = await (async () => {
      switch (rpc) {
        case "admin_delete_user":
          return supabase.rpc("admin_delete_user", { p_user_id: id });
        case "admin_delete_garage":
          return supabase.rpc("admin_delete_garage", { p_garage_id: id });
        case "admin_delete_vehicle":
          return supabase.rpc("admin_delete_vehicle", { p_vehicle_id: id });
        case "admin_delete_fill_up":
          return supabase.rpc("admin_delete_fill_up", { p_fill_up_id: id });
      }
    })();
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
        title="Smazat"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Smazat
      </button>
      {error && (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </span>
      )}
    </span>
  );
}

/* -------------------------- Toggle admin flag --------------------------- */

export function AdminToggleButton({
  userId,
  isAdmin,
}: {
  userId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_user_admin", {
      p_user_id: userId,
      p_is_admin: !isAdmin,
    });
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md disabled:opacity-50 ${
          isAdmin
            ? "text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
            : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
        }`}
        title={isAdmin ? "Zrušit admin" : "Povýšit na admina"}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isAdmin ? (
          <ShieldOff className="h-3.5 w-3.5" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        {isAdmin ? "Zrušit admin" : "Admin"}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </span>
  );
}

/* -------------------------- Inline edit --------------------------------- */

export type EditField =
  | { name: string; label: string; type: "text" | "number" | "date" }
  | { name: string; label: string; type: "textarea" };

export function AdminEditButton<T extends Record<string, unknown>>({
  rpc,
  idParam,
  row,
  fields,
  title,
}: {
  /** RPC name. */
  rpc: string;
  /** Parameter name for the row id, e.g. "p_vehicle_id". */
  idParam: string;
  row: T & { id: string };
  fields: EditField[];
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        row[f.name] == null ? "" : String(row[f.name]),
      ]),
    ),
  );

  async function save() {
    setError(null);
    const supabase = createClient();
    const payload: Record<string, unknown> = { [idParam]: row.id };
    for (const f of fields) {
      const raw = values[f.name];
      const empty = raw === "" || raw == null;
      if (f.type === "number") {
        payload[`p_${f.name}`] = empty ? null : Number(raw);
      } else {
        payload[`p_${f.name}`] = empty ? null : raw;
      }
    }
    // v2.10.0 — `rpc` here is the caller-supplied edit RPC string; the
    //   payload is dynamic. We narrow the rpc name via a runtime guard
    //   would need a closed enum on caller side; instead we keep one
    //   targeted cast — the supabase client itself is no longer `any`.
    const { error } = await (supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>)(rpc, payload);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="Upravit"
      >
        <Pencil className="h-3.5 w-3.5" />
        Upravit
      </button>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <label key={f.name} className="block">
                  <span className="label">{f.label}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      className="input"
                      value={values[f.name] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                      rows={3}
                    />
                  ) : (
                    <input
                      type={f.type}
                      className="input"
                      value={values[f.name] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary text-sm"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="btn-primary text-sm inline-flex items-center gap-1"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------- Table shell --------------------------------- */

export function AdminTableCard({
  title,
  toolbar,
  children,
  empty,
}: {
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">{toolbar}</div>
      </div>
      <div className="card overflow-x-auto">
        {empty ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nic k zobrazení.
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
