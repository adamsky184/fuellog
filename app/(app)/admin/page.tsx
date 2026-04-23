import Link from "next/link";
import { Users, Warehouse, Car, Fuel, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin overview — top-level counts pulled straight from the tables.
 * Because /admin already checks is_admin in the parent layout, the counts
 * here will succeed (no RLS hurdle for admin profile, but base tables are
 * still RLS-gated, so we use the admin_* RPCs to get system-wide totals).
 */
export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [usersRes, garagesRes, vehiclesRes, fillUpsRes] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_list_garages"),
    supabase.rpc("admin_list_vehicles"),
    supabase.rpc("admin_list_fill_ups", { p_vehicle_id: null, p_limit: 1 }),
  ]);

  // `admin_list_fill_ups` returns up to p_limit rows, so use COUNT for totals
  // by asking for a big number and counting — or better, hit the table with a
  // head count using a DB function. Keep the overview page simple: sum what
  // each RPC returned and note the fill-up total comes from a separate query.
  const users = (usersRes.data ?? []) as Array<{
    vehicle_count: number;
    fill_up_count: number;
    garage_count: number;
  }>;
  const totalUsers = users.length;
  const totalGarages = (garagesRes.data ?? []).length;
  const totalVehicles = (vehiclesRes.data ?? []).length;
  const totalFillUps = users.reduce(
    (sum, u) => sum + Number(u.fill_up_count ?? 0),
    0,
  );
  // Suppress unused var
  void fillUpsRes;

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
  );
}
