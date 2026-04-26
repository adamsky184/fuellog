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

/** Inline panel rendered at the top of the dashboard. */
export function StatsVisibilityPanel({
  hidden,
  onChange,
}: {
  hidden: Set<StatsCardId>;
  onChange: (next: Set<StatsCardId>) => void;
}) {
  const [open, setOpen] = useState(false);
  const visibleCount = ALL_IDS.length - hidden.size;
  return (
    <details
      className="card p-3"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none flex items-center gap-2 text-sm">
        <Settings2 className="h-4 w-4 text-slate-500" />
        <span className="font-medium">Co zobrazit</span>
        <span className="text-xs text-slate-400 ml-auto">
          {visibleCount} z {ALL_IDS.length} aktivních
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
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
              className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-left transition ${
                isHidden
                  ? "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100"
                  : "bg-accent/10 text-accent hover:bg-accent/20"
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
      <p className="text-[11px] text-slate-400 mt-2">
        Volba se uloží jen v tomto prohlížeči.
      </p>
    </details>
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
