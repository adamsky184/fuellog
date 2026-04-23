import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Users, Warehouse, Car, Fuel } from "lucide-react";
import { AdminTabLink } from "@/components/admin-tab-link";

/**
 * Admin-only layout.
 *
 * Gate: we hide the entire tree behind notFound() for non-admins rather than
 * a redirect or 403 — someone who can't see the panel doesn't need to know
 * it exists. The server-side profile lookup is the only source of truth;
 * the `isAdmin` prop that Header consumes is only for UI chrome.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) notFound();

  const tabs = [
    { href: "/admin", label: "Přehled", icon: ShieldCheck, exact: true },
    { href: "/admin/users", label: "Uživatelé", icon: Users },
    { href: "/admin/garages", label: "Garáže", icon: Warehouse },
    { href: "/admin/vehicles", label: "Vozidla", icon: Car },
    { href: "/admin/fill-ups", label: "Tankování", icon: Fuel },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm ring-1 ring-white/20">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Admin panel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Plný přístup ke všem účtům, garážím, vozidlům a tankováním.
          </p>
        </div>
      </div>

      <nav className="flex gap-1 text-sm border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <AdminTabLink key={t.href} {...t} />
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
