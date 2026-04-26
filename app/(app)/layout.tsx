import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { OfflineSync } from "@/components/offline-sync";
import { BackToTop } from "@/components/back-to-top";
import { GlobalErrorCatcher } from "@/components/global-error-catcher";
import { AccentInit } from "@/components/accent-init";
import { AlertTriangle } from "lucide-react";
import { rethrowIfNextInternal } from "@/lib/next-errors";

// All authenticated routes touch cookies() via createClient() — mark the
// whole segment as dynamic so Next never attempts a static pre-render.
// Without this, cookies() throws DYNAMIC_SERVER_USAGE during build, our
// try/catch swallows it, and the resulting static fallback can leak into
// the served page at runtime.
export const dynamic = "force-dynamic";

/**
 * App-wide layout for authenticated routes.
 *
 * Loads the user's vehicle list (direct + shared via garage membership —
 * RLS handles the filtering) so the Header can show a switcher on every
 * screen, not just on vehicle pages. Garage names are fetched in parallel
 * so the menu can group cars by garage. Also reads profiles.is_admin to
 * conditionally expose the /admin entry point.
 *
 * Defensive posture: every async step is individually wrapped in try/catch
 * and we NEVER throw. Throwing from a server layout shows up in production
 * as an opaque "Server Components render error" with only a digest — Adam
 * sees nothing useful. Instead, whatever fails is rendered as an inline
 * warning card above the regular UI, so the app shell still works and the
 * child page can still run.
 *
 * Even `redirect("/login")` throws NEXT_REDIRECT intentionally — that is
 * caught by Next itself, but we return a plain <Link> fallback if auth
 * genuinely failed, so we never depend on that throw semantics for unauth.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1) Auth
  let userId: string | null = null;
  let userEmail: string | null = null;
  let authError: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      authError = `auth.getUser: ${error.message}`;
      console.error("[(app) layout] auth error", error);
    } else {
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    }
  } catch (e) {
    rethrowIfNextInternal(e);
    authError = e instanceof Error ? e.message : String(e);
    console.error("[(app) layout] auth threw", e);
  }

  // Not logged in → render a soft login prompt (no throw).
  if (!userId && !authError) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-3">
        <h1 className="text-xl font-semibold">Nejsi přihlášen</h1>
        <Link href="/login" className="btn-primary text-sm">
          Přihlásit se
        </Link>
      </main>
    );
  }

  // Auth itself failed → render a debuggable error card instead of throwing.
  if (authError || !userId) {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Nelze ověřit přihlášení</h1>
        </div>
        <div className="card p-4 space-y-2 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900">
          <p className="text-sm">
            <span className="font-semibold">Auth:</span>{" "}
            {authError ?? "(userId null)"}
          </p>
        </div>
        <Link href="/login" className="btn-secondary text-sm">
          Přejít na přihlášení
        </Link>
      </main>
    );
  }

  // 2) Vehicles / garages / profile — each in its own try/catch so one bad
  //    query doesn't nuke the whole shell.
  type VRow = {
    id: string;
    name: string;
    color: string | null;
    make: string | null;
    model: string | null;
    garage_id: string | null;
    photo_path: string | null;
    first_year: number | null;
    last_year: number | null;
    has_recent_fillup: boolean;
  };
  type GRow = { id: string; name: string; sort_order: number | null };

  let vehicles: VRow[] = [];
  let garages: GRow[] = [];
  let isAdmin = false;
  const loadErrors: Array<{ src: string; msg: string }> = [];

  try {
    const supabase = await createClient();
    // v2.9.0 — also pull photo_path; merge with vehicle_date_range_v for the
    // year-range badge in the switcher.
    const [vRes, drRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, name, color, make, model, garage_id, photo_path, archived_at, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicle_date_range_v")
        .select("vehicle_id, first_year, last_year, last_date"),
    ]);
    if (vRes.error) {
      loadErrors.push({ src: "vehicles", msg: vRes.error.message });
      console.error("[(app) layout] vehicles query error", vRes.error);
    } else {
      const dr = new Map<string, { first_year: number | null; last_year: number | null; last_date: string | null }>();
      for (const r of (drRes.data ?? []) as { vehicle_id: string; first_year: number | null; last_year: number | null; last_date: string | null }[]) {
        dr.set(r.vehicle_id, { first_year: r.first_year, last_year: r.last_year, last_date: r.last_date });
      }
      const today = new Date();
      vehicles = (vRes.data ?? []).map((v) => {
        const meta = dr.get(v.id as string);
        const archivedAt = (v as { archived_at: string | null }).archived_at;
        const lastDate = meta?.last_date ? new Date(meta.last_date) : null;
        // Archived vehicles never count as "still driving" so they sort
        // below active cars in the switcher.
        const recent = !archivedAt && lastDate
          ? today.getTime() - lastDate.getTime() < 120 * 24 * 60 * 60 * 1000
          : false;
        const archivedYear = archivedAt ? new Date(archivedAt).getFullYear() : null;
        const lastYear = archivedYear != null
          ? Math.max(meta?.last_year ?? 0, archivedYear) || archivedYear
          : meta?.last_year ?? null;
        return {
          id: v.id as string,
          name: v.name as string,
          color: (v.color as string | null) ?? null,
          make: (v.make as string | null) ?? null,
          model: (v.model as string | null) ?? null,
          garage_id: (v.garage_id as string | null) ?? null,
          photo_path: (v.photo_path as string | null) ?? null,
          first_year: meta?.first_year ?? null,
          last_year: lastYear,
          has_recent_fillup: recent,
        };
      });
    }
  } catch (e) {
    rethrowIfNextInternal(e);
    loadErrors.push({
      src: "vehicles",
      msg: e instanceof Error ? e.message : String(e),
    });
    console.error("[(app) layout] vehicles threw", e);
  }

  try {
    const supabase = await createClient();
    const [gRes, gusRes] = await Promise.all([
      supabase.from("garages").select("id, name").order("created_at", { ascending: true }),
      supabase.from("garage_user_settings").select("garage_id, sort_order").eq("user_id", userId),
    ]);
    if (gRes.error) {
      loadErrors.push({ src: "garages", msg: gRes.error.message });
      console.error("[(app) layout] garages query error", gRes.error);
    } else {
      const orderMap = new Map<string, number>();
      for (const r of (gusRes.data ?? []) as { garage_id: string; sort_order: number }[]) {
        orderMap.set(r.garage_id, r.sort_order);
      }
      garages = (gRes.data ?? []).map((g) => ({
        id: g.id as string,
        name: g.name as string,
        sort_order: orderMap.get(g.id as string) ?? null,
      }));
    }
  } catch (e) {
    rethrowIfNextInternal(e);
    loadErrors.push({
      src: "garages",
      msg: e instanceof Error ? e.message : String(e),
    });
    console.error("[(app) layout] garages threw", e);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      loadErrors.push({ src: "profile", msg: error.message });
      console.error("[(app) layout] profile query error", error);
    } else {
      isAdmin = Boolean((data as { is_admin?: boolean } | null)?.is_admin);
    }
  } catch (e) {
    rethrowIfNextInternal(e);
    loadErrors.push({
      src: "profile",
      msg: e instanceof Error ? e.message : String(e),
    });
    console.error("[(app) layout] profile threw", e);
  }

  return (
    <>
      <Header
        userEmail={userEmail}
        vehicles={vehicles}
        garages={garages}
        isAdmin={isAdmin}
      />
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-3">
        {loadErrors.length > 0 && (
          <div className="card p-3 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 space-y-1">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-semibold">
                Některá data se nenačetla — aplikace jede dál
              </span>
            </div>
            <ul className="text-[11px] space-y-0.5 text-amber-900 dark:text-amber-100">
              {loadErrors.map((e) => (
                <li key={e.src}>
                  <code className="font-mono">{e.src}</code>: {e.msg}
                </li>
              ))}
            </ul>
          </div>
        )}
        {children}
      </main>
      <OfflineSync />
      <BackToTop />
      <GlobalErrorCatcher />
      <AccentInit />
    </>
  );
}
