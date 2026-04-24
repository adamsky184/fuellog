import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Users, Warehouse, Car, Fuel, AlertTriangle, Stethoscope } from "lucide-react";
import { AdminTabLink } from "@/components/admin-tab-link";
import { rethrowIfNextInternal } from "@/lib/next-errors";

// Admin routes depend on cookies() via createClient() — mark the whole
// segment dynamic so Next never attempts a static pre-render. Without this
// the DYNAMIC_SERVER_USAGE signal gets eaten by our try/catch at build
// time and can surface as a masked "Server Components render error" at
// runtime (digest 1715506935 on Vercel).
export const dynamic = "force-dynamic";

/**
 * Admin-only layout.
 *
 * Hard-line defensive posture: the ENTIRE function body runs inside one
 * outer try/catch that returns an inline error card for ANY throw — so
 * even a synchronous failure inside `createClient()` or `cookies()` can
 * never bubble up to the generic "Server Components render error" digest
 * that Next hides behind in production.
 *
 * Every async step is also individually wrapped and logged to
 * console.error so Vercel's function logs pick it up.
 *
 * The /api/admin-probe diagnostic route runs the same queries and
 * returns JSON — linked from the inline error card so Adam can share
 * the real failure in one click.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
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
      rethrowIfNextInternal(e);
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
        rethrowIfNextInternal(e);
        profileError = e instanceof Error ? e.message : String(e);
        console.error("[admin layout] profile query threw", e);
      }
    }

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
          <div className="flex gap-2">
            <Link
              href="/api/admin-probe"
              prefetch={false}
              className="btn-primary text-sm inline-flex items-center gap-1"
            >
              <Stethoscope className="h-4 w-4" />
              Spustit diagnostiku (JSON)
            </Link>
            <Link href="/vehicles" className="btn-secondary text-sm">
              Zpět na vozidla
            </Link>
          </div>
        </div>
      );
    }

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
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Admin panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Plný přístup ke všem účtům, garážím, vozidlům a tankováním.
            </p>
          </div>
          <Link
            href="/api/admin-probe"
            prefetch={false}
            className="btn-secondary text-xs hidden sm:inline-flex items-center gap-1"
            title="Diagnostika admin endpointů — vrátí JSON se stavem všech dotazů."
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Probe
          </Link>
        </div>

        <nav className="flex gap-1 text-sm border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <AdminTabLink key={t.href} {...t} />
          ))}
        </nav>

        <div>{children}</div>
      </div>
    );
  } catch (e) {
    // Absolute last line of defence — any synchronous/render-time error
    // surfaces here with the real message, instead of the masked digest.
    rethrowIfNextInternal(e);
    console.error("[admin layout] OUTER catch", e);
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : null;
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Admin layout spadl</h1>
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
