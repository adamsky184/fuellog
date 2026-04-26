import Link from "next/link";
import {
  Users,
  Warehouse,
  Car,
  Fuel,
  ArrowRight,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { APP_VERSION } from "@/lib/version";
import { rethrowIfNextInternal } from "@/lib/next-errors";

/**
 * Admin overview — top-level counts pulled straight from the tables.
 *
 * v2.4.5 — HARD outer try/catch around the ENTIRE function body so any
 * throw (including from `createClient()` / `cookies()` during server
 * render) surfaces inline with the real message + stack, instead of
 * bubbling up past the layout to (app)/error.tsx where Next masks it.
 *
 * Each RPC still gets its own safeRpc wrapper so partial failures render
 * a visible warning card but don't block the rest of the page.
 *
 * APP_VERSION is rendered in BOTH success and error paths so we can
 * confirm from the browser whether the deploy actually landed.
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
    rethrowIfNextInternal(e);
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export default async function AdminOverviewPage() {
  try {
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
    const totalGarages = Array.isArray(garagesRes.data)
      ? garagesRes.data.length
      : 0;
    const totalVehicles = Array.isArray(vehiclesRes.data)
      ? vehiclesRes.data.length
      : 0;
    const totalFillUps = users.reduce(
      (sum: number, u: UserRow) => sum + Number(u?.fill_up_count ?? 0),
      0,
    );

    const errors: Array<{ src: string; msg: string }> = [];
    if (usersRes.error)
      errors.push({ src: "admin_list_users", msg: usersRes.error });
    if (garagesRes.error)
      errors.push({ src: "admin_list_garages", msg: garagesRes.error });
    if (vehiclesRes.error)
      errors.push({ src: "admin_list_vehicles", msg: vehiclesRes.error });

    // v2.16.0 — admin tile colour rainbow retired. All cards use the
    //   user's accent so /admin reads as "the same product" instead of
    //   a different theme.
    const cards = [
      {
        href: "/admin/users",
        label: "Uživatelé",
        count: totalUsers,
        icon: Users,
        tone: "bg-accent",
      },
      {
        href: "/admin/garages",
        label: "Garáže",
        count: totalGarages,
        icon: Warehouse,
        tone: "bg-accent",
      },
      {
        href: "/admin/vehicles",
        label: "Vozidla",
        count: totalVehicles,
        icon: Car,
        tone: "bg-accent",
      },
      {
        href: "/admin/fill-ups",
        label: "Tankování",
        count: totalFillUps,
        icon: Fuel,
        tone: "bg-accent",
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
                  className={`inline-grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm ${c.tone}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {c.label}
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {c.count}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            );
          })}
        </div>

        <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 text-right">
          FuelLog v{APP_VERSION}
        </div>
      </div>
    );
  } catch (e) {
    rethrowIfNextInternal(e);
    console.error("[admin overview] OUTER catch", e);
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Admin overview spadl</h1>
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
          <Link href="/vehicles" className="btn-secondary text-sm">
            Zpět na vozidla
          </Link>
        </div>
      </div>
    );
  }
}
