import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { OfflineSync } from "@/components/offline-sync";

/**
 * App-wide layout for authenticated routes.
 *
 * Loads the user's vehicle list (direct + shared via garage membership —
 * RLS handles the filtering) so the Header can show a switcher on every
 * screen, not just on vehicle pages. Garage names are fetched in parallel
 * so the menu can group cars by garage. Also reads profiles.is_admin to
 * conditionally expose the /admin entry point.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [vehRes, garRes, profileRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, name, color, make, model, garage_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("garages")
      .select("id, name")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle(),
  ]);

  const vehicles = (vehRes.data ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
    color: (v.color as string | null) ?? null,
    make: (v.make as string | null) ?? null,
    model: (v.model as string | null) ?? null,
    garage_id: (v.garage_id as string | null) ?? null,
  }));
  const garages = (garRes.data ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
  }));
  const isAdmin = Boolean(
    (profileRes.data as { is_admin?: boolean } | null)?.is_admin,
  );

  return (
    <>
      <Header
        userEmail={data.user.email ?? null}
        vehicles={vehicles}
        garages={garages}
        isAdmin={isAdmin}
      />
      <main className="max-w-5xl mx-auto p-4 sm:p-6">{children}</main>
      <OfflineSync />
    </>
  );
}
