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
import { useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Info } from "lucide-react";
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
import { formatCurrency, formatNumber } from "@/lib/utils";
import { countryLabel } from "@/lib/regions";

export type RawStatsRow = {
  date: string | null;
  odometer_km: number | null;
  liters: number | null;
  total_price: number | null;
  price_per_liter: number | null;
  consumption_l_per_100km: number | null;
  km_since_last: number | null;
  station_brand: string | null;
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

/* ----- Styled info tooltip dot ----- */

function InfoDot({ description }: { description: string }) {
  return (
    <span className="relative inline-flex group align-middle" tabIndex={0}>
      <span className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-800 cursor-help" style={{ width: 14, height: 14 }}>
        <Info className="h-2.5 w-2.5" />
      </span>
      <span className="pointer-events-none absolute right-0 top-4 z-20 hidden group-hover:block group-focus:block w-56 p-2 text-xs leading-snug rounded-md bg-slate-900 text-white shadow-lg">
        {description}
      </span>
    </span>
  );
}

/* ----- Stat tile with optional info tooltip ----- */

function Stat({
  label,
  value,
  info,
}: {
  label: string;
  value: string;
  info?: string;
}) {
  return (
    <div className="card p-3 relative">
      <div className="flex items-start justify-between gap-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        {info && <InfoDot description={info} />}
      </div>
      <div className="font-semibold text-lg">{value}</div>
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

function SplitRow({ b }: { b: Bucket }) {
  const avgL100 = b.km > 0 ? (b.liters / b.km) * 100 : null;
  const avgKcL = b.liters > 0 ? b.price / b.liters : null;
  const kcKm = b.km > 0 ? b.price / b.km : null;
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-2 py-1 font-medium">{b.label}</td>
      <td className="px-2 py-1 text-right tabular-nums">{b.count}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatNumber(b.km, 0)}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatNumber(b.liters, 1)}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(b.price)}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatNumber(avgL100, 2)}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatNumber(avgKcL, 2)}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatNumber(kcKm, 2)}</td>
    </tr>
  );
}

function bucketize(rows: RawStatsRow[], label: string): Bucket {
  let count = 0, liters = 0, price = 0, km = 0;
  for (const r of rows) {
    count += 1;
    liters += Number(r.liters ?? 0);
    price += Number(r.total_price ?? 0);
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
}: {
  rows: RawStatsRow[];
  vehicleId: string;
  currentOdometer: number;
}) {
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
    const price = filtered.reduce((a, r) => a + Number(r.total_price ?? 0), 0);
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
      const price = subset.reduce((a, r) => a + Number(r.total_price ?? 0), 0);
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
    const map = new Map<string, { liters: number; count: number; priceSum: number; priceN: number; consSum: number; consN: number }>();
    for (const r of filtered) {
      const key = r.station_brand?.trim() || "—";
      const e = map.get(key) ?? { liters: 0, count: 0, priceSum: 0, priceN: 0, consSum: 0, consN: 0 };
      e.liters += Number(r.liters ?? 0);
      e.count += 1;
      if (r.price_per_liter != null) { e.priceSum += Number(r.price_per_liter); e.priceN += 1; }
      if (r.consumption_l_per_100km != null) { e.consSum += Number(r.consumption_l_per_100km); e.consN += 1; }
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([brand, v]) => ({
        brand,
        liters: Number(v.liters.toFixed(2)),
        count: v.count,
        avgPricePerL: v.priceN > 0 ? Number((v.priceSum / v.priceN).toFixed(2)) : null,
        avgL100: v.consN > 0 ? Number((v.consSum / v.consN).toFixed(2)) : null,
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
      e.price += Number(r.total_price ?? 0);
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
      e.price += Number(r.total_price ?? 0);
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
      {/* Header: period selector + roční report */}
      <div className="card p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Období</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
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
                className={`px-2.5 py-1 ${
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
          <span className="text-xs text-slate-500 dark:text-slate-400">
            · {filtered.length}× · {formatNumber(totalAgg.km, 0)} km
          </span>
        </div>
        <Link
          href={`/v/${vehicleId}/report?year=${latestYear}`}
          className="btn-secondary text-xs inline-flex items-center gap-1"
        >
          <FileDown className="h-3.5 w-3.5" />
          Roční report
        </Link>
      </div>

      {/* Top tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Aktuální tachometr"
          value={`${formatNumber(currentOdometer, 0)} km`}
          info="Nejvyšší zaznamenaný stav tachometru (včetně baseline záznamu)."
        />
        <Stat
          label="Najeto v období"
          value={`${formatNumber(totalAgg.km, 0)} km`}
          info={`Součet km_since_last přes všechna tankování v období: ${periodLabel}.`}
        />
        <Stat
          label="Litrů v období"
          value={formatNumber(totalAgg.liters, 1)}
          info="Součet natankovaných litrů za zvolené období."
        />
        <Stat
          label="Kč v období"
          value={formatCurrency(totalAgg.price)}
          info="Součet zaplacených částek za zvolené období."
        />
        <Stat
          label="Ø L/100 km"
          value={formatNumber(totalAgg.avgL100, 2)}
          info="Vážený průměr spotřeby: celkové litry / celkové km × 100. Počítáno ze všech tankování v období."
        />
        <Stat
          label="Ø Kč/l"
          value={formatNumber(totalAgg.avgPricePerL, 2)}
          info="Celková cena / celkové litry. Vážený průměr — dražší tankování mají větší váhu."
        />
        <Stat
          label="Kč/km"
          value={formatNumber(totalAgg.czkPerKm, 2)}
          info="Celková cena v Kč za ujetý kilometr. Počítá náklad na palivo bez oprav a servisu."
        />
        <Stat
          label="Počet tankování"
          value={String(filtered.length)}
          info="Kolikrát jsi tankoval v zvoleném období."
        />
      </div>

      {/* Period averages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat
          label="Ø tankování / den"
          value={formatNumber(periodAvgs.fillUpsPerDay, 3)}
          info={`Počet tankování / délka období ve dnech. Období má ${Math.round(spanDays)} dní.`}
        />
        <Stat
          label="Ø tankování / měsíc"
          value={formatNumber(periodAvgs.fillUpsPerMonth, 2)}
          info="Počet tankování / počet měsíců v období (1 měsíc ≈ 30,44 dne)."
        />
        <Stat
          label="Ø tankování / rok"
          value={formatNumber(periodAvgs.fillUpsPerYear, 1)}
          info="Počet tankování / počet let v období."
        />
        <Stat
          label="Ø km / den"
          value={formatNumber(periodAvgs.kmPerDay, 1)}
          info="Ujeté km / počet dní v období. Zahrnuje všechny dny, i ty bez tankování."
        />
        <Stat
          label="Ø km / měsíc"
          value={formatNumber(periodAvgs.kmPerMonth, 0)}
          info="Ujeté km / počet měsíců v období."
        />
        <Stat
          label="Ø km / rok"
          value={formatNumber(periodAvgs.kmPerYear, 0)}
          info="Ujeté km / počet let v období."
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
        info="Rozdělení podle příznaku dálničního tankování."
      />

      {/* ČR vs zahraničí */}
      <SplitTable
        title="ČR vs. zahraničí"
        buckets={czVsForeign}
        info="Rozdělení podle státu — Česko vs. všechny cizí státy dohromady."
      />

      {/* Praha vs zbytek ČR */}
      <SplitTable
        title="Praha vs. zbytek ČR"
        buckets={prahaVsCz}
        info="V rámci Česka: tankování v Praze (regiony P1–P10) vs. mimo ni."
      />

      {/* Monthly with horizon selector */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="font-semibold">Měsíční přehled</div>
            <InfoDot description="Součty po měsících. Jezdec vpravo určuje, kolik posledních měsíců zobrazit." />
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

      {yearsAvailableAll.length > 0 && (
        <CalendarHeatmap rows={heatmapRows} yearsAvailable={yearsAvailableAll} />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <PriceTrend data={priceSeries} />
        <ConsumptionTrend data={consumptionSeries} />
        <BrandRanking data={brandData} />
        <BrandBreakdown data={brandData.filter((b) => b.brand !== "—").slice(0, 10)} />
        <CountryBreakdown data={countryData} />
        <RegionBreakdown data={regionData} />
        <YearlyChart data={yearlyChartData} />
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="font-semibold">Roční souhrn</div>
          <InfoDot description="Součty po kalendářních letech v rámci zvoleného období." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="text-left px-2 py-1">Rok</th>
                <th className="text-right px-2 py-1">km</th>
                <th className="text-right px-2 py-1">Litry</th>
                <th className="text-right px-2 py-1">Kč</th>
                <th className="text-right px-2 py-1">Tankování</th>
                <th className="text-right px-2 py-1">Ø Kč/l</th>
                <th className="text-right px-2 py-1">Ø L/100</th>
                <th className="text-right px-2 py-1">Kč/km</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map(([y, e]) => (
                <tr key={y} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1 font-medium">{y}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{formatNumber(e.km, 0)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{formatNumber(e.liters, 1)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(e.price)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{e.count}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{e.liters > 0 ? formatNumber(e.price / e.liters, 2) : "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{e.km > 0 ? formatNumber((e.liters / e.km) * 100, 2) : "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{e.km > 0 ? formatNumber(e.price / e.km, 2) : "—"}</td>
                </tr>
              ))}
              {yearly.length === 0 && (
                <tr><td colSpan={8} className="px-2 py-4 text-center text-slate-500">Žádná data v tomto období.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
