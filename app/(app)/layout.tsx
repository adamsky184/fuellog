import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { OfflineSync } from "@/components/offline-sync";
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
  };
  type GRow = { id: string; name: string };

  let vehicles: VRow[] = [];
  let garages: GRow[] = [];
  let isAdmin = false;
  const loadErrors: Array<{ src: string; msg: string }> = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, name, color, make, model, garage_id, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      loadErrors.push({ src: "vehicles", msg: error.message });
      console.error("[(app) layout] vehicles query error", error);
    } else {
      vehicles = (data ?? []).map((v) => ({
        id: v.id as string,
        name: v.name as string,
        color: (v.color as string | null) ?? null,
        make: (v.make as string | null) ?? null,
        model: (v.model as string | null) ?? null,
        garage_id: (v.garage_id as string | null) ?? null,
      }));
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
    const { data, error } = await supabase
      .from("garages")
      .select("id, name")
      .order("created_at", { ascending: true });
    if (error) {
      loadErrors.push({ src: "garages", msg: error.message });
      console.error("[(app) layout] garages query error", error);
    } else {
      garages = (data ?? []).map((g) => ({
        id: g.id as string,
        name: g.name as string,
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
    </>
  );
}
