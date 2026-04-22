"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fuel, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-700">
      <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 py-3">
        <Link href="/vehicles" className="flex items-center gap-2 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-accent text-white grid place-items-center">
            <Fuel className="h-4 w-4" />
          </span>
          <span>FuelLog</span>
        </Link>

        {vehicleId && vehicleName && (
          <nav className="hidden sm:flex items-center gap-1 text-sm ml-4">
            <Link href={`/v/${vehicleId}/fill-ups`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Tankování
            </Link>
            <Link href={`/v/${vehicleId}/stats`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Statistiky
            </Link>
            <Link href={`/v/${vehicleId}/maintenance`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Servis
            </Link>
            <Link href={`/v/${vehicleId}/import`} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Import
            </Link>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link
            href="/profile"
            className="muted hidden sm:block hover:text-slate-700 dark:hover:text-slate-200 hover:underline"
            title="Můj profil"
          >
            {userEmail}
          </Link>
          <ThemeToggle />
          <button
            onClick={signOut}
            className="btn-secondary text-xs inline-flex items-center gap-1"
            title="Odhlásit"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Odhlásit</span>
          </button>
        </div>
      </div>
    </header>
  );
}
