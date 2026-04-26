"use client";

/**
 * Full stats dashboard — client-side orchestrator.
 *
 * Receives the raw fill-up stats rows + current odometer from the server
 * component, then renders:
 *   - period selector (Všechno / Rok / Měsíc / Týden / Vlastní)
 *   - top tiles with info tooltips
 *   - "Poslední aktivita" (30/365 d) — still absolute, independent of filter
 *   - brand + country + region + Praha-vs-ČR + ČR-vs-zahraničí breakdowns
 *   - monthly / yearly charts (all-time, user-controlled horizon)
 *   - calendar heatmap
 *
 * All numbers recompute via useMemo when the filter changes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileDown,
  Info,
  Gauge,
  Route,
  Droplet,
  Fuel,
  Coins,
  Wallet,
  Hash,
  TrendingUp,
  CalendarRange,
  Flag,
  Landmark,
  Building2,
  MilestoneIcon,
  Globe,
} from "lucide-react";
import {
  BrandBreakdown,
  BrandRanking,
  ConsumptionTrend,
  CountryBreakdown,
  MonthlyTrends,
  PriceTrend,
  RecentActivity,
  RegionBreakdown,
  TopBrands,
  YearlyChart,
} from "@/components/stats-charts";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { YearlySummaryTable } from "@/components/yearly-summary-table";
import { StatsMaps } from "@/components/stats-maps";
import {
  StatsCard,
  StatsVisibilityPanel,
  useStatsVisibility,
} from "@/components/stats-visibility";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { countryLabel } from "@/lib/regions";

export type RawStatsRow = {
  date: string | null;
  odometer_km: number | null;
  liters: number | null;
  total_price: number | null;
  /** v2.8.0: total_price normalised to CZK via the convert_to_czk function. */
  total_price_czk: number | null;
  price_per_liter: number | null;
  /** v2.8.0: price_per_liter in CZK. */
  price_per_liter_czk: number | null;
  consumption_l_per_100km: number | null;
  km_since_last: number | null;
  station_brand: string | null;
  currency: string | null;
  country: string | null;
  region: string | null;
  is_baseline: boolean | null;
  is_highway: boolean | null;
};

type PeriodPreset = "all" | "year" | "month" | "week" | "custom";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00");
  const b = new Date(toIso + "T00:00:00");
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/* ----- Styled info tooltip dot -----
 *
 * v2.5.0: rewritten as a click/tap-toggle so it works on mobile (where
 * `:hover` doesn't fire and focus on a `<span>` is unreliable on iOS Safari).
 * Desktop keeps hover — clicking is still supported everywhere.
 * Width is capped to the viewport via `max-w-[min(16rem,calc(100vw-2rem))]`
 * so the bubble never overflows on a narrow phone.
 */

function InfoDot({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex group align-middle"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Informace"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-800 cursor-help focus:outline-none focus:ring-2 focus:ring-sky-400"
        style={{ width: 18, height: 18 }}
      >
        <Info className="h-3 w-3" />
      </button>
      <span
        className={`pointer-events-none absolute right-0 top-6 z-20 w-[16rem] max-w-[calc(100vw-2rem)] p-2 text-xs leading-snug rounded-md bg-slate-900 text-white shadow-lg ${
          open ? "block" : "hidden group-hover:block"
        }`}
      >
        {description}
      </span>
    </span>
  );
}

/* ----- Stat tile with optional info tooltip, accent tone and icon ----- */

type StatTone = "km" | "fuel" | "money" | "count";

const TONES: Record<
  StatTone,
  {
    iconBg: string;
    iconColor: string;
    ring: string;
    gradient: string;
  }
> = {
  km: {
    iconBg: "bg-violet-100 dark:bg-violet-950/50",
    iconColor: "text-violet-600 dark:text-violet-300",
    ring: "ring-violet-500/10 dark:ring-violet-400/10",
    gradient:
      "before:bg-gradient-to-br before:from-violet-500/5 before:to-transparent",
  },
  fuel: {
    iconBg: "bg-sky-100 dark:bg-sky-950/50",
    iconColor: "text-sky-600 dark:text-sky-300",
    ring: "ring-sky-500/10 dark:ring-sky-400/10",
    gradient:
      "before:bg-gradient-to-br before:from-sky-500/5 before:to-transparent",
  },
  money: {
    iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-500/10 dark:ring-emerald-400/10",
    gradient:
      "before:bg-gradient-to-br before:from-emerald-500/5 before:to-transparent",
  },
  count: {
    iconBg: "bg-amber-100 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-300",
    ring: "ring-amber-500/10 dark:ring-amber-400/10",
    gradient:
      "before:bg-gradient-to-br before:from-amber-500/5 before:to-transparent",
  },
};

function Stat({
  label,
  mobileLabel,
  value,
  info,
  tone,
  icon,
}: {
  label: string;
  /**
   * v2.7.0 — shorter label rendered at <sm breakpoints. Falls back to `label`.
   * Use it for tiles whose long label otherwise truncates on mobile.
   */
  mobileLabel?: string;
  value: string;
  info?: string;
  tone?: StatTone;
  icon?: React.ReactNode;
}) {
  const t = tone ? TONES[tone] : null;
  // Default icon inferred from tone if not provided.
  const resolvedIcon =
    icon ??
    (tone === "km" ? (
      <Route className="h-4 w-4" />
    ) : tone === "fuel" ? (
      <Droplet className="h-4 w-4" />
    ) : tone === "money" ? (
      <Coins className="h-4 w-4" />
    ) : tone === "count" ? (
      <Hash className="h-4 w-4" />
    ) : null);

  // v2.9.0 — moved the gradient into a self-clipping overlay so the
  // outer card no longer needs overflow-hidden. Without that, the
  // InfoDot tooltip was being clipped against the card edge — Adam's
  // "popisky občas divně zarovnané" complaint. Tooltip now spills
  // freely outside the card.
  return (
    <div className="card p-3 relative isolate">
      {t?.gradient && (
        <span
          aria-hidden
          className={`absolute inset-0 rounded-2xl pointer-events-none ${t.gradient}`}
        />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {resolvedIcon && t && (
              <span
                className={`inline-flex items-center justify-center h-6 w-6 rounded-lg ${t.iconBg} ${t.iconColor} ring-1 ${t.ring}`}
              >
                {resolvedIcon}
              </span>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {mobileLabel ? (
                <>
                  <span className="sm:hidden">{mobileLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              ) : (
                label
              )}
            </div>
          </div>
          <div className="font-semibold text-lg mt-1.5 tabular-nums">
            {value}
          </div>
        </div>
        {info && <InfoDot description={info} />}
      </div>
    </div>
  );
}

/* ----- Praha vs rest-of-CZ vs abroad split ----- */

type Bucket = {
  label: string;
  count: number;
  liters: number;
  price: number;
  km: number;
};

/** Pick a colored dot + icon based on the bucket label. */
function bucketAccent(label: string): { color: string; icon: React.ReactNode } {
  const L = label.toLowerCase();
  if (L.startsWith("česko")) return { color: "#DC2626", icon: <Flag className="h-3 w-3" /> };
  if (L.startsWith("zahrani")) return { color: "#2563EB", icon: <Globe className="h-3 w-3" /> };
  if (L.startsWith("praha")) return { color: "#7C3AED", icon: <Landmark className="h-3 w-3" /> };
  if (L.startsWith("zbytek")) return { color: "#0891B2", icon: <Building2 className="h-3 w-3" /> };
  if (L.includes("mimo dálnici") || L.startsWith("město")) return { color: "#D97706", icon: <Building2 className="h-3 w-3" /> };
  if (L.startsWith("dálnice")) return { color: "#059669", icon: <MilestoneIcon className="h-3 w-3" /> };
  return { color: "#64748B", icon: null };
}

function SplitRow({ b }: { b: Bucket }) {
  const avgL100 = b.km > 0 ? (b.liters / b.km) * 100 : null;
  const avgKcL = b.liters > 0 ? b.price / b.liters : null;
  const kcKm = b.km > 0 ? b.price / b.km : null;
  const accent = bucketAccent(b.label);
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-2 py-1.5 font-medium">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center h-5 w-5 rounded-md text-white shrink-0"
            style={{ backgroundColor: accent.color }}
          >
            {accent.icon}
          </span>
          <span>{b.label}</span>
        </span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">{b.count}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(b.km, 0)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(b.liters, 1)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(b.price)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(avgL100, 2)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(avgKcL, 2)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(kcKm, 2)}</td>
    </tr>
  );
}

function bucketize(rows: RawStatsRow[], label: string): Bucket {
  let count = 0, liters = 0, price = 0, km = 0;
  for (const r of rows) {
    count += 1;
    liters += Number(r.liters ?? 0);
    price += Number(r.total_price_czk ?? r.total_price ?? 0);
    km += Number(r.km_since_last ?? 0);
  }
  return { label, count, liters, price, km };
}

function SplitTable({ title, buckets, info }: { title: string; buckets: Bucket[]; info?: string }) {
  if (buckets.every((b) => b.count === 0)) return null;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="font-semibold">{title}</div>
        {info && <InfoDot description={info} />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase">
            <tr>
              <th className="text-left px-2 py-1">Skupina</th>
              <th className="text-right px-2 py-1">Tankování</th>
              <th className="text-right px-2 py-1">km</th>
              <th className="text-right px-2 py-1">Litry</th>
              <th className="text-right px-2 py-1">Kč</th>
              <th className="text-right px-2 py-1">Ø L/100</th>
              <th className="text-right px-2 py-1">Ø Kč/l</th>
              <th className="text-right px-2 py-1">Kč/km</th>
            </tr>
          </thead>
          <tbody>
            {buckets.filter((b) => b.count > 0).map((b) => (
              <SplitRow key={b.label} b={b} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----- Component ----- */

export function StatsDashboard({
  rows,
  vehicleId,
  currentOdometer,
  title,
  filtersSlot,
}: {
  rows: RawStatsRow[];
  /** Optional. When undefined, the "Roční report" link is hidden. */
  vehicleId?: string;
  currentOdometer: number;
  title?: string;
  /** v2.9.10 — extra filter controls (vehicle/garage selectors) injected
   *  next to the period selector inside the same card. Lets the garage
   *  stats pages keep all filters on a single visual row. */
  filtersSlot?: React.ReactNode;
}) {
  // v2.12.0 — per-card visibility, persisted in localStorage.
  const visibility = useStatsVisibility();

  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>(todayIso());
  const [monthlyWindow, setMonthlyWindow] = useState<"12" | "24" | "36" | "all">("24");

  // Compute [fromDate, toDate] (inclusive on both ends) based on preset
  const { fromDate, toDate, periodLabel } = useMemo(() => {
    const today = todayIso();
    const t = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "all") return { fromDate: null as string | null, toDate: null as string | null, periodLabel: "Celé období" };
    if (preset === "year") {
      return { fromDate: `${t.getFullYear()}-01-01`, toDate: today, periodLabel: `Rok ${t.getFullYear()}` };
    }
    if (preset === "month") {
      const mo = String(t.getMonth() + 1).padStart(2, "0");
      return { fromDate: `${t.getFullYear()}-${mo}-01`, toDate: today, periodLabel: `Tento měsíc` };
    }
    if (preset === "week") {
      const d = new Date(t);
      d.setDate(d.getDate() - 6);
      return { fromDate: iso(d), toDate: today, periodLabel: `Posledních 7 dní` };
    }
    // custom
    return {
      fromDate: customFrom || null,
      toDate: customTo || null,
      periodLabel: "Vlastní období",
    };
  }, [preset, customFrom, customTo]);

  // Raw rows (excluding baseline)
  const rowsAll = rows.filter((r) => !r.is_baseline);

  // Rows that fall in the selected window
  const filtered = useMemo(() => {
    return rowsAll.filter((r) => {
      if (!r.date) return false;
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      return true;
    });
  }, [rowsAll, fromDate, toDate]);

  // Period span for per-day/month/year averages
  const spanDays = useMemo(() => {
    if (preset === "all" || !fromDate || !toDate) {
      const dates = rowsAll.map((r) => r.date).filter(Boolean) as string[];
      if (dates.length === 0) return 1;
      const min = dates.reduce((a, b) => (a < b ? a : b));
      const max = dates.reduce((a, b) => (a > b ? a : b));
      return daysBetween(min, max);
    }
    return daysBetween(fromDate, toDate);
  }, [preset, fromDate, toDate, rowsAll]);

  const totalAgg = useMemo(() => {
    const liters = filtered.reduce((a, r) => a + Number(r.liters ?? 0), 0);
    const price = filtered.reduce((a, r) => a + Number(r.total_price_czk ?? r.total_price ?? 0), 0);
    const km = filtered.reduce((a, r) => a + Number(r.km_since_last ?? 0), 0);
    return {
      liters,
      price,
      km,
      count: filtered.length,
      avgL100: km > 0 ? (liters / km) * 100 : null,
      avgPricePerL: liters > 0 ? price / liters : null,
      czkPerKm: km > 0 ? price / km : null,
    };
  }, [filtered]);

  // Averages per day/month/year in the selected window.
  const periodAvgs = useMemo(() => {
    const d = spanDays;
    const months = d / 30.4375;
    const years = d / 365.25;
    return {
      fillUpsPerDay: filtered.length / d,
      fillUpsPerMonth: filtered.length / Math.max(1 / 30, months),
      fillUpsPerYear: filtered.length / Math.max(1 / 365, years),
      kmPerDay: totalAgg.km / d,
      kmPerMonth: totalAgg.km / Math.max(1 / 30, months),
      kmPerYear: totalAgg.km / Math.max(1 / 365, years),
    };
  }, [filtered, spanDays, totalAgg]);

  // Fixed "recent activity" card — last 30 / 365 days (absolute, not period-filtered)
  const recentData = useMemo(() => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const cutoff = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return iso(d);
    };
    const range = (since: string) => {
      const subset = rowsAll.filter((r) => r.date && r.date >= since);
      const liters = subset.reduce((a, r) => a + Number(r.liters ?? 0), 0);
      const price = subset.reduce((a, r) => a + Number(r.total_price_czk ?? r.total_price ?? 0), 0);
      const km = subset.reduce((a, r) => a + Number(r.km_since_last ?? 0), 0);
      return { liters, price, km: Math.round(km), count: subset.length };
    };
    return { days30: range(cutoff(30)), days365: range(cutoff(365)) };
  }, [rowsAll]);

  // Price trend — month-aggregated averages, country filter is inside the component.
  const priceSeries = useMemo(
    () =>
      filtered
        .filter((r) => r.price_per_liter != null && r.date)
        .map((r) => ({
          date: r.date!.slice(0, 7),
          pricePerLiter: Number(r.price_per_liter),
          country: r.country ?? "CZ",
        })),
    [filtered],
  );
  const consumptionSeries = useMemo(
    () =>
      filtered
        .filter((r) => r.consumption_l_per_100km != null && r.date)
        .map((r) => ({ date: r.date!.slice(0, 7), consumption: Number(r.consumption_l_per_100km) })),
    [filtered],
  );

  // Brand breakdown
  const brandData = useMemo(() => {
    const map = new Map<string, { liters: number; count: number; priceSum: number; priceN: number; consSum: number; consN: number; totalCzk: number }>();
    for (const r of filtered) {
      const key = r.station_brand?.trim() || "—";
      const e = map.get(key) ?? { liters: 0, count: 0, priceSum: 0, priceN: 0, consSum: 0, consN: 0, totalCzk: 0 };
      e.liters += Number(r.liters ?? 0);
      e.count += 1;
      if (r.price_per_liter != null) { e.priceSum += Number(r.price_per_liter); e.priceN += 1; }
      if (r.consumption_l_per_100km != null) { e.consSum += Number(r.consumption_l_per_100km); e.consN += 1; }
      // v2.12.0 — accumulate Kč spent per pump (CZK already converted by view).
      e.totalCzk += Number(r.total_price_czk ?? r.total_price ?? 0);
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([brand, v]) => ({
        brand,
        liters: Number(v.liters.toFixed(2)),
        count: v.count,
        avgPricePerL: v.priceN > 0 ? Number((v.priceSum / v.priceN).toFixed(2)) : null,
        avgL100: v.consN > 0 ? Number((v.consSum / v.consN).toFixed(2)) : null,
        totalCzk: Math.round(v.totalCzk),
      }))
      .sort((a, b) => b.liters - a.liters);
  }, [filtered]);

  // Country breakdown
  const countryData = useMemo(() => {
    const map = new Map<string, { liters: number; count: number }>();
    for (const r of filtered) {
      const key = countryLabel(r.country ?? "CZ");
      const e = map.get(key) ?? { liters: 0, count: 0 };
      e.liters += Number(r.liters ?? 0);
      e.count += 1;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([country, v]) => ({ country, ...v, liters: Number(v.liters.toFixed(2)) }))
      .sort((a, b) => b.liters - a.liters);
  }, [filtered]);

  // Region breakdown
  const regionData = useMemo(() => {
    const map = new Map<string, { region: string | null; country: string | null; liters: number; count: number }>();
    for (const r of filtered) {
      const key = `${r.country ?? "CZ"}|${r.region ?? ""}`;
      const e = map.get(key) ?? { region: r.region, country: r.country ?? "CZ", liters: 0, count: 0 };
      e.liters += Number(r.liters ?? 0);
      e.count += 1;
      map.set(key, e);
    }
    return Array.from(map.values());
  }, [filtered]);

  // ČR vs zahraničí
  const czVsForeign = useMemo(() => {
    const cz = filtered.filter((r) => (r.country ?? "CZ") === "CZ");
    const abroad = filtered.filter((r) => (r.country ?? "CZ") !== "CZ");
    return [bucketize(cz, "Česko"), bucketize(abroad, "Zahraničí")];
  }, [filtered]);

  // Praha vs zbytek ČR
  const prahaVsCz = useMemo(() => {
    const cz = filtered.filter((r) => (r.country ?? "CZ") === "CZ");
    const praha = cz.filter((r) => r.region && r.region.startsWith("P"));
    const rest = cz.filter((r) => !r.region || !r.region.startsWith("P"));
    return [bucketize(praha, "Praha"), bucketize(rest, "Zbytek ČR")];
  }, [filtered]);

  // Město vs dálnice (moved here so it follows period filter)
  const cityVsHighway = useMemo(() => {
    const city = filtered.filter((r) => !r.is_highway);
    const hwy = filtered.filter((r) => r.is_highway);
    return [bucketize(city, "Mimo dálnici"), bucketize(hwy, "Dálnice")];
  }, [filtered]);

  // Monthly
  const monthlyAll = useMemo(() => {
    const map = new Map<string, { km: number; liters: number; price: number }>();
    for (const r of filtered) {
      if (!r.date) continue;
      const m = r.date.slice(0, 7);
      const e = map.get(m) ?? { km: 0, liters: 0, price: 0 };
      e.km += Number(r.km_since_last ?? 0);
      e.liters += Number(r.liters ?? 0);
      e.price += Number(r.total_price_czk ?? r.total_price ?? 0);
      map.set(m, e);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, e]) => ({ month, km: Math.round(e.km), liters: Number(e.liters.toFixed(1)), price: Math.round(e.price) }));
  }, [filtered]);
  const monthly = useMemo(() => {
    if (monthlyWindow === "all") return monthlyAll;
    const n = parseInt(monthlyWindow, 10);
    return monthlyAll.slice(-n);
  }, [monthlyAll, monthlyWindow]);

  // Yearly
  const yearly = useMemo(() => {
    const map = new Map<string, { km: number; liters: number; price: number; count: number }>();
    for (const r of filtered) {
      if (!r.date) continue;
      const y = r.date.slice(0, 4);
      const e = map.get(y) ?? { km: 0, liters: 0, price: 0, count: 0 };
      e.km += Number(r.km_since_last ?? 0);
      e.liters += Number(r.liters ?? 0);
      e.price += Number(r.total_price_czk ?? r.total_price ?? 0);
      e.count += 1;
      map.set(y, e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);
  const yearlyChartData = yearly.map(([year, e]) => ({
    year, km: Math.round(e.km), liters: Number(e.liters.toFixed(1)), price: Math.round(e.price),
  }));

  // Heatmap input — always all years (ignores period)
  const heatmapRows = rowsAll.map((r) => ({
    date: r.date ?? null,
    liters: r.liters == null ? null : Number(r.liters),
    total_price: r.total_price == null ? null : Number(r.total_price),
    is_baseline: r.is_baseline ?? null,
  }));
  const yearsAvailableAll = useMemo(() => {
    const ys = new Set<number>();
    for (const r of rowsAll) if (r.date) ys.add(parseInt(r.date.slice(0, 4), 10));
    return Array.from(ys).sort((a, b) => a - b);
  }, [rowsAll]);
  const latestYear = yearsAvailableAll[yearsAvailableAll.length - 1] ?? new Date().getFullYear();

  return (
    <div className="space-y-4">
      {title && (
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
      )}
      {/* Header: period selector + roční report.
          v2.9.11 — filtersSlot (Vozidla / Garáže) renders FIRST so the
          row reads as "Vozidla → Garáže → Období → totals". */}
      <div className="card p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {filtersSlot}
          <div className="inline-flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
              <CalendarRange className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
              Období
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs shadow-sm">
            {([
              ["all", "Všechno"],
              ["year", "Letos"],
              ["month", "Tento měsíc"],
              ["week", "Týden"],
              ["custom", "Vlastní"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setPreset(k as PeriodPreset)}
                className={`px-2.5 py-1 transition ${
                  preset === k
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="inline-flex items-center gap-1 text-xs">
              <input
                type="date"
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50">
            <Hash className="h-3 w-3 opacity-60" />
            {filtered.length}×
            <span className="mx-0.5 opacity-40">·</span>
            <Route className="h-3 w-3 opacity-60" />
            {formatNumber(totalAgg.km, 0)} km
          </span>
        </div>
        {vehicleId && (
          <Link
            href={`/v/${vehicleId}/report?year=${latestYear}`}
            className="btn-secondary text-xs inline-flex items-center gap-1"
          >
            <FileDown className="h-3.5 w-3.5" />
            Roční report
          </Link>
        )}
      </div>

      {/* Top tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* v2.9.6 — "Aktuální tachometr" only makes sense per-vehicle. In an
            aggregated/garage context (no vehicleId), drop the tile so the
            row reads as "Najeto / Litrů / Kč / Ø L/100" — all values that
            sum cleanly across vehicles. */}
        {vehicleId && (
          <Stat
            label="Aktuální tachometr"
            mobileLabel="Tachometr"
            value={`${formatNumber(currentOdometer, 0)} km`}
            info="Nejvyšší stav tachometru, který jsi kdy zapsal."
            tone="km"
            icon={<Gauge className="h-4 w-4" />}
          />
        )}
        <Stat
          label="Najeto v období"
          value={`${formatNumber(totalAgg.km, 0)} km`}
          info={`Kolik kilometrů jsi ujel za vybrané období (${periodLabel.toLowerCase()}).`}
          tone="km"
        />
        <Stat
          label="Litrů v období"
          value={formatNumber(totalAgg.liters, 1)}
          info="Kolik litrů paliva jsi natankoval za vybrané období."
          tone="fuel"
        />
        <Stat
          label="Kč v období"
          value={formatCurrency(totalAgg.price)}
          info="Kolik jsi za palivo utratil za vybrané období."
          tone="money"
        />
        <Stat
          label="Ø L/100 km"
          value={formatNumber(totalAgg.avgL100, 2)}
          info="Průměrná spotřeba — celkové litry děleno celkové kilometry krát 100. Dražší tankování mají větší váhu."
          tone="fuel"
          icon={<Fuel className="h-4 w-4" />}
        />
        <Stat
          label="Ø Kč/l"
          value={formatNumber(totalAgg.avgPricePerL, 2)}
          info="Průměrná cena za litr — celková cena děleno celkové litry."
          tone="money"
          icon={<Wallet className="h-4 w-4" />}
        />
        <Stat
          label="Kč/km"
          value={formatNumber(totalAgg.czkPerKm, 2)}
          info="Kolik tě stál jeden ujetý kilometr (jen palivo, bez servisu a oprav)."
          tone="money"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Počet tankování"
          mobileLabel="Tankování"
          value={String(filtered.length)}
          info="Kolikrát jsi ve vybraném období tankoval."
          tone="count"
        />
      </div>

      {/* Period averages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat
          label="Ø tankování / den"
          mobileLabel="Ø za den"
          value={formatNumber(periodAvgs.fillUpsPerDay, 3)}
          info={`Průměrný počet tankování na den (období má ${Math.round(spanDays)} dní).`}
          tone="count"
          icon={<CalendarRange className="h-4 w-4" />}
        />
        <Stat
          label="Ø tankování / měsíc"
          mobileLabel="Ø za měsíc"
          value={formatNumber(periodAvgs.fillUpsPerMonth, 2)}
          info="Průměrný počet tankování za měsíc v tomto období."
          tone="count"
          icon={<CalendarRange className="h-4 w-4" />}
        />
        <Stat
          label="Ø tankování / rok"
          mobileLabel="Ø za rok"
          value={formatNumber(periodAvgs.fillUpsPerYear, 1)}
          info="Průměrný počet tankování za rok v tomto období."
          tone="count"
          icon={<CalendarRange className="h-4 w-4" />}
        />
        <Stat
          label="Ø km / den"
          value={formatNumber(periodAvgs.kmPerDay, 1)}
          info="Průměrný počet ujetých kilometrů na den — počítá se ze všech dní v období, i bez tankování."
          tone="km"
        />
        <Stat
          label="Ø km / měsíc"
          value={formatNumber(periodAvgs.kmPerMonth, 0)}
          info="Průměrný počet ujetých kilometrů za měsíc v tomto období."
          tone="km"
        />
        <Stat
          label="Ø km / rok"
          value={formatNumber(periodAvgs.kmPerYear, 0)}
          info="Průměrný počet ujetých kilometrů za rok v tomto období."
          tone="km"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <RecentActivity data={recentData} />
        <TopBrands data={brandData.filter((b) => b.brand !== "—")} />
      </div>

      {/* Město vs dálnice — period-filtered */}
      <SplitTable
        title="Město vs. dálnice"
        buckets={cityVsHighway}
        info="Porovnání tankování označených jako dálnice a těch ostatních."
      />

      {/* ČR vs zahraničí */}
      <SplitTable
        title="ČR vs. zahraničí"
        buckets={czVsForeign}
        info="Porovnání tankování v Česku a v zahraničí."
      />

      {/* Praha vs zbytek ČR */}
      <SplitTable
        title="Praha vs. zbytek ČR"
        buckets={prahaVsCz}
        info="Tankování v Praze (regiony P1–P10) vs. tankování mimo Prahu — pouze v rámci Česka."
      />

      {/* Monthly with horizon selector */}
      <div className="card p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="font-semibold">Měsíční přehled</div>
            <InfoDot description="Součty km, litrů a Kč po jednotlivých měsících. Přepínačem vpravo si zvolíš, kolik posledních měsíců chceš vidět." />
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
            {([
              ["12", "12 M"],
              ["24", "24 M"],
              ["36", "36 M"],
              ["all", "Vše"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMonthlyWindow(k)}
                className={`px-2.5 py-1 ${
                  monthlyWindow === k
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <MonthlyTrends data={monthly} naked />
      </div>

      {/* v2.12.0 — visibility panel: user can hide individual cards. */}
      <StatsVisibilityPanel hidden={visibility.hidden} onChange={visibility.setHidden} />

      {yearsAvailableAll.length > 0 && (
        <StatsCard id="calendarHeatmap" visible={visibility.isVisible("calendarHeatmap")}>
          <CalendarHeatmap rows={heatmapRows} yearsAvailable={yearsAvailableAll} />
        </StatsCard>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <StatsCard id="priceTrend" visible={visibility.isVisible("priceTrend")}>
          <PriceTrend data={priceSeries} />
        </StatsCard>
        <StatsCard id="consumptionTrend" visible={visibility.isVisible("consumptionTrend")}>
          <ConsumptionTrend data={consumptionSeries} />
        </StatsCard>
        <StatsCard id="brandRanking" visible={visibility.isVisible("brandRanking")}>
          <BrandRanking data={brandData} />
        </StatsCard>
        <StatsCard id="brandBreakdown" visible={visibility.isVisible("brandBreakdown")}>
          <BrandBreakdown data={brandData.filter((b) => b.brand !== "—").slice(0, 10)} />
        </StatsCard>
        <StatsCard id="countryBreakdown" visible={visibility.isVisible("countryBreakdown")}>
          <CountryBreakdown data={countryData} />
        </StatsCard>
        <StatsCard id="regionBreakdown" visible={visibility.isVisible("regionBreakdown")}>
          <RegionBreakdown data={regionData} />
        </StatsCard>
        <StatsCard id="yearlyChart" visible={visibility.isVisible("yearlyChart")}>
          <YearlyChart data={yearlyChartData} />
        </StatsCard>
      </div>

      {/* v2.11.0 — three tile-style choropleths fed from the filtered rows. */}
      <StatsCard id="maps" visible={visibility.isVisible("maps")}>
        <StatsMaps rows={filtered} />
      </StatsCard>

      <StatsCard id="yearlySummary" visible={visibility.isVisible("yearlySummary")}>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-semibold">Roční souhrn</div>
            <InfoDot description="Souhrn po kalendářních letech — jen roky spadající do vybraného období. Klikni na sloupec pro seřazení." />
          </div>
          <YearlySummaryTable rows={yearly} />
        </div>
      </StatsCard>
    </div>
  );
}
