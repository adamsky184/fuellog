"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  BarChart3,
  Wrench,
  FileUp,
  Settings,
  ClipboardList,
  ShieldCheck,
  Plus,
  UserCircle2,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { VehicleSwitcher, type SwitcherVehicle, type SwitcherGarage } from "@/components/vehicle-switcher";

export function Header({
  userEmail,
  vehicles,
  garages,
  isAdmin = false,
}: {
  userEmail: string | null;
  vehicles: SwitcherVehicle[];
  garages: SwitcherGarage[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Derive the currently-viewed vehicle from the URL so a single Header in the
  // app layout tracks navigation without needing each page to hand it down.
  const currentVehicleId =
    pathname?.match(/^\/v\/([^/]+)/)?.[1] ?? null;
  const inVehicle = currentVehicleId != null;

  // Pick a sensible default for the "+" button: currently-viewed vehicle, or
  // the first one from the user's list, or null (hide button when no vehicles).
  const quickAddVehicleId = currentVehicleId ?? vehicles[0]?.id ?? null;

  const tabs = inVehicle
    ? [
        { href: `/v/${currentVehicleId}/fill-ups`, label: "Tankování", icon: ClipboardList },
        { href: `/v/${currentVehicleId}/stats`, label: "Statistiky", icon: BarChart3 },
        { href: `/v/${currentVehicleId}/maintenance`, label: "Servis", icon: Wrench },
        { href: `/v/${currentVehicleId}/import`, label: "Import", icon: FileUp },
        { href: `/v/${currentVehicleId}/settings`, label: "Nastavení", icon: Settings },
      ]
    : [];

  // On mobile the header only surfaces the two most-used destinations as big
  // buttons (Tankování + Statistiky). Everything else lives in the hamburger
  // menu. Adam's feedback: "hlavní je stejně tankování a statistiky, to musí
  // být dominantní, servis, import/export a nastavení může být v menu".
  const primaryTabs = tabs.slice(0, 2);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Close the menu on any navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/85 dark:border-slate-700/80 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div className="max-w-5xl mx-auto flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2">
        <Link
          href="/vehicles"
          className="flex items-center gap-2 font-semibold shrink-0"
          aria-label="FuelLog — vozidla"
        >
          {/* v2.7.1 — replaced gradient + lucide Fuel icon with the actual app
              icon (red pump on sky-blue), so the brand mark in the header
              matches the favicon and the home-screen icon. */}
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={32}
            height={32}
            priority
            className="w-8 h-8 rounded-xl shadow-sm ring-1 ring-white/20"
          />
          <span className="hidden sm:inline">FuelLog</span>
        </Link>

        <VehicleSwitcher
          vehicles={vehicles}
          garages={garages}
          currentVehicleId={currentVehicleId}
        />

        {inVehicle && (
          <nav className="hidden md:flex items-center gap-0.5 text-sm ml-1">
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

        <div className="ml-auto flex items-center gap-1 sm:gap-2 text-sm">
          {quickAddVehicleId && (
            <Link
              href={`/v/${quickAddVehicleId}/fill-ups/new`}
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white px-2.5 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-white/20 hover:brightness-110 active:scale-95 transition"
              title="Nové tankování"
              aria-label="Nové tankování"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tankování</span>
            </Link>
          )}

          <ThemeToggle />

          {/* Unified user menu — visible on ALL breakpoints so mobile users
              can reach Profil, Admin, Odhlásit. Replaces the old
              hidden-on-mobile email link + separate Admin/Logout buttons. */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-secondary text-xs inline-flex items-center gap-1 px-2 py-1.5"
              title="Menu"
              aria-label="Otevřít menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-lg dark:bg-slate-900 dark:border-slate-700 overflow-hidden z-20"
                role="menu"
              >
                {/* Vehicle tabs — all of them, ordered so the two primary ones
                    (Tankování, Statistiky) come first. The same list is the
                    dominant pair rendered as big buttons below the header on
                    mobile; we repeat them here for keyboard/accessibility
                    completeness and so desktop users who've hidden the nav
                    still have a path. */}
                {inVehicle &&
                  tabs.map((t) => {
                    const Icon = t.icon;
                    const active = pathname?.startsWith(t.href);
                    return (
                      <Link
                        key={t.href}
                        href={t.href}
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          active ? "bg-slate-50 dark:bg-slate-800 font-medium" : ""
                        }`}
                        role="menuitem"
                      >
                        <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                        {t.label}
                      </Link>
                    );
                  })}

                {inVehicle && (
                  <div className="border-t border-slate-100 dark:border-slate-800" />
                )}

                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  role="menuitem"
                >
                  <UserCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="flex flex-col min-w-0">
                    <span className="font-medium">Profil</span>
                    {userEmail && (
                      <span className="text-xs text-slate-500 truncate">{userEmail}</span>
                    )}
                  </span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    role="menuitem"
                  >
                    <ShieldCheck className="h-4 w-4 text-rose-500 shrink-0" />
                    Admin panel
                  </Link>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4 text-slate-500 shrink-0" />
                  Odhlásit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / tablet sub-nav — two dominant primary tabs. Servis / Import /
          Nastavení moved into the user menu to declutter. */}
      {inVehicle && (
        <nav className="md:hidden border-t border-slate-200/80 dark:border-slate-700/80 px-2 py-2">
          <div className="grid grid-cols-2 gap-2">
            {primaryTabs.map((t) => {
              const active = pathname?.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
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
