"use client";

/**
 * v2.14.0 — global command palette opened with ⌘K / Ctrl+K.
 *
 * Searchable list of:
 *   - jump to vehicle (every active vehicle the user can see)
 *   - "+ Tankování" for the current / first vehicle
 *   - top-level destinations (Garáže, Statistiky, Servis, …)
 *   - settings / theme / accent
 *
 * Pure client, zero deps. Renders via a portal-less fixed wrapper
 * inside the (app) layout so it always sits above headers + sticky
 * thead. Premium signal — Linear/Notion/Vercel all have one.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  ClipboardList,
  BarChart3,
  Wrench,
  FileUp,
  Settings,
  Plus,
  Warehouse,
  ArrowLeftRight,
  Palette,
  Moon,
  User,
  ShieldCheck,
} from "lucide-react";

type VehicleOpt = { id: string; name: string };

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: string;
  keywords: string;
  perform: () => void;
};

export function CommandPalette({
  vehicles,
  currentVehicleId,
  isAdmin,
}: {
  vehicles: VehicleOpt[];
  currentVehicleId: string | null;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // ⌘K / Ctrl+K to toggle, Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActiveIdx(0);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const quickVehicleId = currentVehicleId ?? vehicles[0]?.id ?? null;

  const items: CommandItem[] = useMemo(() => {
    const acts: CommandItem[] = [];

    if (quickVehicleId) {
      acts.push({
        id: "new-fillup",
        label: "Nové tankování",
        hint: "Přidat záznam k aktuálnímu vozu",
        icon: <Plus className="h-4 w-4" />,
        group: "Akce",
        keywords: "tankování přidat nový plus add fillup",
        perform: () => router.push(`/v/${quickVehicleId}/fill-ups/new`),
      });
    }

    acts.push(
      {
        id: "go-garages",
        label: "Moje garáže",
        icon: <Warehouse className="h-4 w-4" />,
        group: "Navigace",
        keywords: "garáže homepage",
        perform: () => router.push("/vehicles"),
      },
      {
        id: "go-compare",
        label: "Porovnat vozy",
        icon: <ArrowLeftRight className="h-4 w-4" />,
        group: "Navigace",
        keywords: "porovnat compare vozy auta",
        perform: () => router.push("/compare"),
      },
      {
        id: "go-garages-stats",
        label: "Souhrn všech vozů",
        icon: <BarChart3 className="h-4 w-4" />,
        group: "Navigace",
        keywords: "souhrn statistiky všech",
        perform: () => router.push("/garages/stats"),
      },
      {
        id: "go-profile",
        label: "Můj profil",
        icon: <User className="h-4 w-4" />,
        group: "Navigace",
        keywords: "profil settings nastavení",
        perform: () => router.push("/profile"),
      },
    );

    if (isAdmin) {
      acts.push({
        id: "go-admin",
        label: "Admin",
        icon: <ShieldCheck className="h-4 w-4" />,
        group: "Navigace",
        keywords: "admin",
        perform: () => router.push("/admin"),
      });
    }

    if (currentVehicleId) {
      acts.push(
        {
          id: "vc-fillups",
          label: "Tankování",
          hint: "Aktuální vůz",
          icon: <ClipboardList className="h-4 w-4" />,
          group: "Aktuální vůz",
          keywords: "tankování fill-ups historie",
          perform: () => router.push(`/v/${currentVehicleId}/fill-ups`),
        },
        {
          id: "vc-stats",
          label: "Statistiky",
          hint: "Aktuální vůz",
          icon: <BarChart3 className="h-4 w-4" />,
          group: "Aktuální vůz",
          keywords: "statistiky stats grafy charts",
          perform: () => router.push(`/v/${currentVehicleId}/stats`),
        },
        {
          id: "vc-maintenance",
          label: "Servis",
          hint: "Aktuální vůz",
          icon: <Wrench className="h-4 w-4" />,
          group: "Aktuální vůz",
          keywords: "servis údržba maintenance",
          perform: () => router.push(`/v/${currentVehicleId}/maintenance`),
        },
        {
          id: "vc-import",
          label: "Import / export",
          hint: "Aktuální vůz",
          icon: <FileUp className="h-4 w-4" />,
          group: "Aktuální vůz",
          keywords: "import export xlsx excel",
          perform: () => router.push(`/v/${currentVehicleId}/import`),
        },
        {
          id: "vc-settings",
          label: "Nastavení vozu",
          hint: "Aktuální vůz",
          icon: <Settings className="h-4 w-4" />,
          group: "Aktuální vůz",
          keywords: "settings nastavení vůz vehicle",
          perform: () => router.push(`/v/${currentVehicleId}/settings`),
        },
      );
    }

    for (const v of vehicles) {
      if (v.id === currentVehicleId) continue;
      acts.push({
        id: `switch-${v.id}`,
        label: v.name,
        hint: "Přepnout na vůz",
        icon: <ClipboardList className="h-4 w-4" />,
        group: "Vozy",
        keywords: `${v.name} přepnout switch`,
        perform: () => router.push(`/v/${v.id}/fill-ups`),
      });
    }

    acts.push(
      {
        id: "th-toggle",
        label: "Přepnout dark / light",
        icon: <Moon className="h-4 w-4" />,
        group: "Vzhled",
        keywords: "dark light tmavý světlý theme režim",
        perform: () => {
          const root = document.documentElement;
          const isDark = root.classList.contains("dark");
          if (isDark) {
            root.classList.remove("dark");
            try { localStorage.setItem("fuellog-theme", "light"); } catch {}
          } else {
            root.classList.add("dark");
            try { localStorage.setItem("fuellog-theme", "dark"); } catch {}
          }
        },
      },
      {
        id: "ac-pick",
        label: "Změnit barvu rozhraní",
        icon: <Palette className="h-4 w-4" />,
        group: "Vzhled",
        keywords: "barva accent palette color",
        perform: () => router.push("/profile#vzhled"),
      },
    );

    return acts;
  }, [router, currentVehicleId, quickVehicleId, vehicles, isAdmin]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    return items.filter((it) => {
      const hay = `${it.label} ${it.keywords} ${it.group}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered, activeIdx]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) item.perform();
    }
  }

  if (!open) return null;

  // Group items by `group` while preserving filtered order.
  const groups: { name: string; items: CommandItem[] }[] = [];
  for (const it of filtered) {
    let g = groups.find((g) => g.name === it.group);
    if (!g) {
      g = { name: it.group, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label="Příkazová paleta"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Hledat akci, vůz, sekci…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
            esc
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Nic nenalezeno
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="mb-1.5 last:mb-0">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
                  {g.name}
                </div>
                {g.items.map((it) => {
                  const flatIdx = filtered.indexOf(it);
                  const isActive = flatIdx === activeIdx;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(flatIdx)}
                      onClick={() => it.perform()}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition ${
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className={isActive ? "text-accent" : "text-slate-400"}>
                        {it.icon}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">{it.label}</span>
                      {it.hint && (
                        <span className="text-[11px] text-slate-400">{it.hint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>
            <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> pro pohyb,
            <kbd className="font-mono ml-1">Enter</kbd> pro výběr
          </span>
          <span>⌘K kdykoli</span>
        </div>
      </div>
    </div>
  );
}
