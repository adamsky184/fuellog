"use client";

/**
 * v2.12.0 — per-card visibility toggles for the stats dashboard.
 *
 * Adam: "přidat možnost Redukce / vlastního zobrazení stats". A small
 * disclosure ▾ panel above the chart grid lists every card; user
 * unchecks the ones they don't want and the layout reflows. Choices
 * are persisted in localStorage.
 *
 * The actual hide/show wrapping is done via the `<StatsCard>` helper
 * and the `useVisible(id)` hook.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Settings2 } from "lucide-react";

const STORAGE_KEY = "fuellog-stats-hidden";

export type StatsCardId =
  | "priceTrend"
  | "consumptionTrend"
  | "brandRanking"
  | "brandBreakdown"
  | "countryBreakdown"
  | "regionBreakdown"
  | "yearlyChart"
  | "calendarHeatmap"
  | "yearlySummary"
  | "maps";

export const STATS_CARD_LABELS: Record<StatsCardId, string> = {
  priceTrend:        "Vývoj ceny",
  consumptionTrend:  "Vývoj spotřeby",
  brandRanking:      "Žebříček pump",
  brandBreakdown:    "Litry podle značky",
  countryBreakdown:  "Litry podle státu",
  regionBreakdown:   "Litry podle kraje",
  yearlyChart:       "Roční graf",
  calendarHeatmap:   "Kalendář tankování",
  yearlySummary:     "Roční souhrn",
  maps:              "Mapy tankování",
};

const ALL_IDS = Object.keys(STATS_CARD_LABELS) as StatsCardId[];

function readHidden(): Set<StatsCardId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is StatsCardId => typeof x === "string" && x in STATS_CARD_LABELS));
  } catch {
    return new Set();
  }
}

function writeHidden(s: Set<StatsCardId>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch {
    /* private mode */
  }
}

/**
 * Hook used by every chart card to know whether it should render.
 * Re-reads from a single source on every render so toggle propagates
 * without prop drilling.
 */
export function useStatsVisibility(): {
  isVisible: (id: StatsCardId) => boolean;
  hidden: Set<StatsCardId>;
  setHidden: (next: Set<StatsCardId>) => void;
  bumpVersion: () => void;
} {
  const [, setVersion] = useState(0);
  const [hidden, setLocalHidden] = useState<Set<StatsCardId>>(() => readHidden());

  useEffect(() => {
    setLocalHidden(readHidden());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLocalHidden(readHidden());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    isVisible: (id: StatsCardId) => !hidden.has(id),
    hidden,
    setHidden: (next: Set<StatsCardId>) => {
      setLocalHidden(next);
      writeHidden(next);
    },
    bumpVersion: () => setVersion((v) => v + 1),
  };
}

/**
 * v2.12.1 — prominent button + popover. The previous <details> disclosure
 * was visually buried; Adam asked for something obviously clickable.
 */
export function StatsVisibilityPanel({
  hidden,
  onChange,
}: {
  hidden: Set<StatsCardId>;
  onChange: (next: Set<StatsCardId>) => void;
}) {
  const [open, setOpen] = useState(false);
  const visibleCount = ALL_IDS.length - hidden.size;
  const hiddenCount = hidden.size;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm transition border ${
          open
            ? "bg-accent text-white border-accent shadow-sm"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-accent hover:shadow-sm"
        }`}
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <Settings2 className="h-4 w-4" />
          Přizpůsobit dashboard
        </span>
        <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full ${
          open
            ? "bg-white/20 text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
        }`}>
          {visibleCount} z {ALL_IDS.length} sekcí
          {hiddenCount > 0 && ` · ${hiddenCount} skryto`}
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-2 card p-4 space-y-3 shadow-lg border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Co zobrazit</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Klikni na sekci pro zapnutí / skrytí.
              </div>
            </div>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-xs px-2 py-1 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Zobrazit vše
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs px-2 py-1 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Zavřít
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ALL_IDS.map((id) => {
              const isHidden = hidden.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    const next = new Set(hidden);
                    if (isHidden) next.delete(id);
                    else next.add(id);
                    onChange(next);
                  }}
                  className={`inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition border ${
                    isHidden
                      ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400"
                      : "border-accent/30 bg-accent/10 text-accent"
                  }`}
                >
                  {isHidden ? (
                    <EyeOff className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{STATS_CARD_LABELS[id]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Conditional wrapper used by each stat card in the dashboard. */
export function StatsCard({
  id,
  visible,
  children,
}: {
  id: StatsCardId;
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) return null;
  return <>{children}</>;
}
