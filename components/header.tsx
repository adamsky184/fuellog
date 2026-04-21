"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header({
  userEmail,
  vehicleName,
  vehicleId,
}: {
  userEmail: string | null;
  vehicleName?: string | null;
  vehicleId?: string | null;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 py-3">
        <Link href="/vehicles" className="flex items-center gap-2 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-accent text-white grid place-items-center text-lg">⛽</span>
          <span>FuelLog</span>
        </Link>

        {vehicleId && vehicleName && (
          <nav className="hidden sm:flex items-center gap-1 text-sm ml-4">
            <Link href={`/v/${vehicleId}/fill-ups`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100">
              Tankování
            </Link>
            <Link href={`/v/${vehicleId}/stats`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100">
              Statistiky
            </Link>
            <Link href={`/v/${vehicleId}/import`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100">
              Import
            </Link>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link
            href="/profile"
            className="text-slate-500 hidden sm:block hover:text-slate-700 hover:underline"
            title="Můj profil"
          >
            {userEmail}
          </Link>
          <button onClick={signOut} className="btn-secondary text-xs">Odhlásit</button>
        </div>
      </div>
    </header>
  );
}
