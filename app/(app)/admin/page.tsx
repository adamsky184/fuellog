import Link from "next/link";
import { Users, Warehouse, Car, Fuel, ArrowRight, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Admin overview — top-level counts pulled straight from the tables.
 *
 * IMPORTANT: we run each RPC individually (not via Promise.all) and catch
 * per-call errors. When a RPC returns `error`, Supabase does NOT throw —
 * but if we then pass a fat object through `JSON.stringify` or pass
 * `null.length` we crash the server render, which shows up as a generic
 * "Server Components render" error in production. So: each RPC gets its
 * own try/catch AND a null-safe unwrap, and whatever we can't read is
 * rendered inline as a visible warning so Adam sees the real reason.
 */

type UserRow = {
  vehicle_count?: number | string | null;
  fill_up_count?: number | string | null;
  garage_count?: number | string | null;
};

async function safeRpc<T>(
  fn: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await fn();
    if (error) {
      return {
        data: null,
        error: `${error.code ?? ""} ${error.message}${error.details ? ` · ${error.details}` : ""}${error.hint ? ` · ${error.hint}` : ""}`.trim(),
      };
    }
    return { data, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const usersRes = await safeRpc<UserRow[]>(() =>
    supabase.rpc("admin_list_users"),
  );
  const garagesRes = await safeRpc<unknown[]>(() =>
    supabase.rpc("admin_list_garages"),
  );
  const vehiclesRes = await safeRpc<unknown[]>(() =>
    supabase.rpc("admin_list_vehicles"),
  );

  const users = Array.isArray(usersRes.data) ? usersRes.data : [];
  const totalUsers = users.length;
  const totalGarages = Array.isArray(garagesRes.data) ? garagesRes.data.length : 0;
  const totalVehicles = Array.isArray(vehiclesRes.data)
    ? vehiclesRes.data.length
    : 0;
  const totalFillUps = users.reduce(
    (sum: number, u: UserRow) => sum + Number(u?.fill_up_count ?? 0),
    0,
  );

  const errors: Array<{ src: string; msg: string }> = [];
  if (usersRes.error) errors.push({ src: "admin_list_users", msg: usersRes.error });
  if (garagesRes.error) errors.push({ src: "admin_list_garages", msg: garagesRes.error });
  if (vehiclesRes.error) errors.push({ src: "admin_list_vehicles", msg: vehiclesRes.error });

  const cards = [
    {
      href: "/admin/users",
      label: "Uživatelé",
      count: totalUsers,
      icon: Users,
      tone: "from-sky-500 to-indigo-500",
    },
    {
      href: "/admin/garages",
      label: "Garáže",
      count: totalGarages,
      icon: Warehouse,
      tone: "from-emerald-500 to-teal-500",
    },
    {
      href: "/admin/vehicles",
      label: "Vozidla",
      count: totalVehicles,
      icon: Car,
      tone: "from-violet-500 to-fuchsia-500",
    },
    {
      href: "/admin/fill-ups",
      label: "Tankování",
      count: totalFillUps,
      icon: Fuel,
      tone: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="card p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">
              Některé dotazy selhaly — zbytek jede dál
            </span>
          </div>
          <ul className="text-xs space-y-1 text-amber-900 dark:text-amber-100">
            {errors.map((e) => (
              <li key={e.src}>
                <code className="font-mono">{e.src}</code>: {e.msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="card p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition group"
            >
              <span
                className={`inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${c.tone}`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {c.label}
                </div>
                <div className="text-2xl font-semibold tabular-nums">{c.count}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
