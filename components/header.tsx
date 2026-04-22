"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fuel, LogOut, BarChart3, Wrench, FileUp, Settings, ClipboardList } from "lucide-react";
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
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tabs = vehicleId
    ? [
        { href: `/v/${vehicleId}/fill-ups`, label: "Tankování", icon: ClipboardList },
        { href: `/v/${vehicleId}/stats`, label: "Statistiky", icon: BarChart3 },
        { href: `/v/${vehicleId}/maintenance`, label: "Servis", icon: Wrench },
        { href: `/v/${vehicleId}/import`, label: "Import", icon: FileUp },
        { href: `/v/${vehicleId}/settings`, label: "Nastavení", icon: Settings },
      ]
    : [];

  return (
    <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/85 dark:border-slate-700/80 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div className="max-w-5xl mx-auto flex items-center gap-3 px-3 sm:px-4 py-2.5">
        <Link
          href="/vehicles"
          className="flex items-center gap-2 font-semibold shrink-0"
        >
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white grid place-items-center shadow-sm ring-1 ring-white/20">
            <Fuel className="h-4 w-4" />
          </span>
          <span>FuelLog</span>
        </Link>

        {vehicleId && vehicleName && (
          <nav className="hidden sm:flex items-center gap-0.5 text-sm ml-2">
            {tabs.map((t) => {
              const active = pathname?.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition ${
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            href="/profile"
            className="muted hidden md:block hover:text-slate-700 dark:hover:text-slate-200 hover:underline max-w-[18ch] truncate"
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

      {/* Mobile sub-nav — horizontally scrollable pills */}
      {vehicleId && vehicleName && (
        <nav className="sm:hidden border-t border-slate-200/80 dark:border-slate-700/80 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 px-2 py-1.5 min-w-max">
            {tabs.map((t) => {
              const active = pathname?.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-xs whitespace-nowrap transition ${
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 bg-slate-50 hover:bg-slate-100 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
