import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Users, Warehouse, Car, Fuel, AlertTriangle } from "lucide-react";
import { AdminTabLink } from "@/components/admin-tab-link";

/**
 * Admin-only layout.
 *
 * Gate: we show a "not authorized" message inline for non-admins rather than
 * a redirect or 403. Someone who can't see the panel doesn't need to know
 * it exists — but crucially, we MUST NOT throw notFound() or any other
 * exception here because any thrown error in a server component gets
 * masked in production and becomes the dreaded
 * "Server Components render error" with an opaque digest.
 *
 * Every async call is individually wrapped in try/catch so we can always
 * render something — even if it's a detailed error card telling Adam
 * exactly what failed.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Each step is isolated and logged to console.error so Vercel's function
  // logs also pick it up (useful cross-reference for the digest hash).
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userError: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      userError = `auth.getUser: ${error.message}`;
      console.error("[admin layout] auth error", error);
    } else {
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    }
  } catch (e) {
    userError = e instanceof Error ? e.message : String(e);
    console.error("[admin layout] auth threw", e);
  }

  let isAdmin = false;
  let profileError: string | null = null;
  if (userId) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        profileError = `profiles lookup: ${error.message} · ${error.details ?? ""} · ${error.hint ?? ""}`.trim();
        console.error("[admin layout] profile query error", error);
      } else {
        isAdmin = Boolean((data as { is_admin?: boolean } | null)?.is_admin);
      }
    } catch (e) {
      profileError = e instanceof Error ? e.message : String(e);
      console.error("[admin layout] profile query threw", e);
    }
  }

  // Error card if we couldn't even establish who the user is or their role.
  if (userError || profileError) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-xl font-semibold">
            Admin panel se nepodařilo načíst
          </h1>
        </div>
        <div className="card p-4 space-y-2 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900">
          {userError && (
            <p className="text-sm">
              <span className="font-semibold">Auth:</span> {userError}
            </p>
          )}
          {profileError && (
            <p className="text-sm">
              <span className="font-semibold">Profile:</span> {profileError}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Přihlášený e-mail: {userEmail ?? "(neznámý)"}
          </p>
        </div>
        <Link href="/vehicles" className="btn-secondary text-sm">
          Zpět na vozidla
        </Link>
      </div>
    );
  }

  // Not logged in → send to login in place of notFound (which would throw).
  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Nejsi přihlášen</h1>
        <Link href="/login" className="btn-primary text-sm">
          Přihlásit se
        </Link>
      </div>
    );
  }

  // Logged in but not admin → friendly access-denied (not a 404).
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Přístup odepřen</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tato sekce je dostupná pouze administrátorům.
        </p>
        <Link href="/vehicles" className="btn-secondary text-sm">
          Zpět na vozidla
        </Link>
      </div>
    );
  }

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
