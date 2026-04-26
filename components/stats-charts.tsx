"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
  ComposedChart,
} from "recharts";
import { countryLabel, regionLabel } from "@/lib/regions";
import { BrandLogo } from "@/components/brand-logo";
import { PALETTE } from "@/lib/chart-palette";

/**
 * Brand colors — used for per-brand bar coloring and the BrandBadge component.
 * Unknown brands fall through to the neutral accent.
 */
// v2.9.10 — keys normalised to lowercase + non-alphanum stripped so the
// lookup matches "SHELL", "Shell", "Shell Praha" all to the same colour.
// Expanded coverage for AGIP, ARAL, BP, ESSO, JET, ROBIN OIL, etc. so the
// "Litry podle značky pumpy" chart renders distinct hues per brand.
export const BRAND_COLORS: Record<string, string> = {
  shell: "#fbbf24",        // amber
  omv: "#1d4ed8",          // royal blue
  benzina: "#15803d",      // green
  mol: "#dc2626",          // red
  eurooil: "#0ea5e9",      // sky
  slovnaft: "#0284c7",     // dark sky
  ono: "#f97316",          // orange
  orlen: "#db2777",        // pink
  agip: "#6d28d9",         // purple
  lukoil: "#b91c1c",       // dark red
  total: "#e11d48",        // rose
  globus: "#059669",       // teal
  tesco: "#1e40af",        // navy
  makro: "#0f766e",        // dark teal
  aral: "#0c4a6e",         // deep blue
  bp: "#65a30d",           // lime
  esso: "#1e3a8a",         // indigo
  jet: "#fde047",          // yellow
  dea: "#a3a3a3",          // grey
  robinoil: "#ea580c",     // burnt orange
  shell_csprim: "#fbbf24", // ČS PRIM (Shell)
  prim: "#7c3aed",         // violet
  cprim: "#7c3aed",
  csprim: "#7c3aed",
  cspr: "#7c3aed",
  petrol: "#a16207",
  petra: "#9333ea",
  cs: "#525252",
  rasthauspentling: "#0d9488",
  q8: "#facc15",
  cepsa: "#16a34a",
  parmo: "#52525b",
  paramo: "#52525b",
  ralf: "#71717a",
  hruby: "#84cc16",
  stopka: "#a855f7",
  avia: "#3b82f6",
  avanti: "#84cc16",
  jiná: "#94a3b8",
};
const DEFAULT_BAR = "#0ea5e9";

function colorForBrand(brand: string): string {
  // Normalise: lowercase, strip non-alphanumeric (handles "Robin Oil",
  // "RobinOil", "ROBIN OIL" → "robinoil").
  const key = brand.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return BRAND_COLORS[key] ?? DEFAULT_BAR;
}

function initialsForBrand(brand: string): string {
  const clean = brand.trim();
  if (!clean) return "?";
  // Multi-word — first letters, up to 2.
  const words = clean.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  // Single word — 1 letter for short names, 2 for longer.
  return clean.slice(0, clean.length <= 4 ? 1 : 2).toUpperCase();
}

/**
 * v2.9.7 — small grey unit suffix used inline next to numeric values
 * across the various stats components (leaderboard, charts, breakdown).
 */
function U({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-normal normal-case">
      {children}
    </span>
  );
}

/**
 * Compact "logo" for a fuel-station brand.
 * Colored circle with brand initials. Consistent per brand via BRAND_COLORS.
 */
export function BrandBadge({
  brand,
  size = 22,
}: {
  brand: string;
  size?: number;
}) {
  const bg = colorForBrand(brand);
  const initials = initialsForBrand(brand);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 shadow-sm"
      style={{
        backgroundColor: bg,
        width: size,
        height: size,
        fontSize: size * (initials.length === 1 ? 0.55 : 0.42),
        lineHeight: 1,
      }}
      aria-hidden
      title={brand}
    >
      {initials}
    </span>
  );
}

/* --------------------------- Price trend (with country filter) -------------- */

type PricePoint = {
  date: string;
  pricePerLiter: number;
  country: string | null;
};

export function PriceTrend({ data }: { data: PricePoint[] }) {
  const [country, setCountry] = useState<string>("ALL");

  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const d of data) s.add(d.country ?? "CZ");
    return Array.from(s).sort((a, b) => a.localeCompare(b, "cs"));
  }, [data]);

  const filtered = useMemo(() => {
    const src = country === "ALL" ? data : data.filter((d) => (d.country ?? "CZ") === country);
    // Aggregate by month (date is already "YYYY-MM"). Average per bucket.
    const byMonth = new Map<string, { sum: number; n: number }>();
    for (const d of src) {
      const e = byMonth.get(d.date) ?? { sum: 0, n: 0 };
      e.sum += d.pricePerLiter;
      e.n += 1;
      byMonth.set(d.date, e);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { sum, n }]) => ({ date, pricePerLiter: Number((sum / n).toFixed(2)) }));
  }, [data, country]);

  return (
    <div className="card p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="font-semibold">Vývoj ceny za litr</div>
        <select
          className="text-xs rounded-md border border-slate-200 px-2 py-1 bg-white"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="ALL">Všechny státy</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
            </option>
          ))}
        </select>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip isAnimationActive={false} />
            <Line type="monotone" dataKey="pricePerLiter" stroke={PALETTE.primary} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Consumption trend ------------------------------ */

export function ConsumptionTrend({ data }: { data: { date: string; consumption: number }[] }) {
  return (
    <div className="card p-4 overflow-hidden">
      <div className="font-semibold mb-3">Vývoj spotřeby (L/100 km)</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip isAnimationActive={false} />
            <Line type="monotone" dataKey="consumption" stroke={PALETTE.primaryStrong} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Brand breakdown -------------------------------- */

export function BrandBreakdown({ data }: { data: { brand: string; liters: number; count: number }[] }) {
  return (
    <div className="card p-4 overflow-hidden">
      <div className="font-semibold mb-3">Litry podle značky pumpy</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="brand"
              interval={0}
              angle={-30}
              textAnchor="end"
              tick={{ fontSize: 10 }}
              height={50}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip isAnimationActive={false} />
            <Legend />
            <Bar dataKey="liters" name="Litry">
              {data.map((d) => (
                <Cell key={d.brand} fill={colorForBrand(d.brand)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Country breakdown ------------------------------ */

export function CountryBreakdown({ data }: { data: { country: string; liters: number; count: number }[] }) {
  // v2.9.10 — when there's a long tail of countries (Adam's PAST garage
  // hits ~14), the X-axis labels collide. Cap to top 8 + roll the rest
  // into "Ostatní". Sort desc by liters before slicing.
  const prepped = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.liters - a.liters);
    if (sorted.length <= 8) return sorted;
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const restLiters = rest.reduce((acc, r) => acc + r.liters, 0);
    const restCount = rest.reduce((acc, r) => acc + r.count, 0);
    return [
      ...top,
      { country: "Ostatní", liters: Number(restLiters.toFixed(1)), count: restCount },
    ];
  }, [data]);

  return (
    <div className="card p-4 overflow-hidden">
      <div className="font-semibold mb-3">Litry podle státu</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={prepped} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="country" interval={0} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number) => `${v.toLocaleString("cs-CZ")} l`}
              isAnimationActive={false}
            />
            <Bar dataKey="liters" fill={PALETTE.primary} name="Litry" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Monthly trends --------------------------------- */

type MonthlyPoint = {
  month: string; // YYYY-MM
  km: number;
  liters: number;
  price: number;
};

/**
 * Bar chart over recent months with a metric toggle (km / L / Kč).
 * Months with no data are skipped on the X axis rather than zero-filled.
 */
export function MonthlyTrends({
  data,
  naked = false,
}: {
  data: MonthlyPoint[];
  /** When true, don't render the outer card/title — the caller provides its own. */
  naked?: boolean;
}) {
  const [metric, setMetric] = useState<"km" | "liters" | "price">("km");

  const metricConfig = {
    km: { label: "Ujeté km", color: "#0ea5e9", unit: "km" },
    liters: { label: "Litry", color: "#f59e0b", unit: "l" },
    price: { label: "Kč", color: "#10b981", unit: "Kč" },
  } as const;

  const cfg = metricConfig[metric];

  if (data.length === 0) return null;

  const metricToggle = (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
      {(Object.keys(metricConfig) as (keyof typeof metricConfig)[]).map((k) => (
        <button
          key={k}
          onClick={() => setMetric(k)}
          className={`px-2.5 py-1 ${
            metric === k
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          {metricConfig[k].label}
        </button>
      ))}
    </div>
  );

  const chart = (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => [`${v.toLocaleString("cs-CZ")} ${cfg.unit}`, cfg.label]} />
          <Bar dataKey={metric} fill={cfg.color} name={cfg.label}  isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (naked) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{metricToggle}</div>
        {chart}
      </div>
    );
  }

  return (
    <div className="card p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="font-semibold">Měsíční přehled</div>
        {metricToggle}
      </div>
      {chart}
    </div>
  );
}

/* --------------------------- Top brands widget ------------------------------ */

export function TopBrands({ data }: { data: { brand: string; liters: number; count: number }[] }) {
  const top = [...data]
    .sort((a, b) => b.count - a.count || b.liters - a.liters)
    .slice(0, 3);
  if (top.length === 0) return null;
  const medals = ["#F59E0B", "#94A3B8", "#B45309"]; // gold / silver / bronze
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/15 to-rose-400/15 blur-2xl pointer-events-none" />
      <div className="flex items-center gap-2 mb-3 relative">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M8 1.5a.75.75 0 0 1 .67.415l1.537 3.114 3.437.499a.75.75 0 0 1 .416 1.28l-2.487 2.423.587 3.423a.75.75 0 0 1-1.088.79L8 11.832 4.928 13.444a.75.75 0 0 1-1.088-.79l.587-3.423L1.94 6.808a.75.75 0 0 1 .416-1.28l3.437-.499L7.33 1.915A.75.75 0 0 1 8 1.5Z" />
          </svg>
        </span>
        <div className="font-semibold">Top 3 pumpy</div>
      </div>
      <ol className="space-y-2 relative">
        {top.map((b, i) => (
          <li
            key={b.brand}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
          >
            <span
              className="inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white tabular-nums shrink-0"
              style={{ backgroundColor: medals[i] }}
            >
              {i + 1}
            </span>
            <BrandLogo brand={b.brand} size={32} />
            <span className="font-medium truncate">{b.brand}</span>
            <span className="ml-auto text-sm text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
              {b.count}× · {b.liters.toFixed(1)} l
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* --------------------------- Brand price ranking ---------------------------- */

type BrandRankRow = {
  brand: string;
  count: number;
  liters: number;
  avgPricePerL: number | null;
  avgL100: number | null;
  /** v2.12.0 — celková útrata u pumpy v CZK (po měnové konverzi). */
  totalCzk: number;
};

/**
 * Žebříček pump — kolik jsi tam tankoval, jaká tam byla průměrná cena za litr
 * a průměrná spotřeba L/100 km. Sortovatelné podle ceny, spotřeby, nebo četnosti.
 */
export function BrandRanking({ data }: { data: BrandRankRow[] }) {
  // v2.9.6 — Adam: "Žebříček pump automaticky srovnej od nejvyššího počtu".
  // v2.9.12 — every column is sortable (incl. brand name + liters).
  type SortKey = "brand" | "count" | "liters" | "totalCzk" | "price" | "consumption";
  const [sortBy, setSortBy] = useState<SortKey>("count");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const filtered = data.filter((d) => d.brand && d.brand !== "—");
    const cmp = (a: BrandRankRow, b: BrandRankRow) => {
      if (sortBy === "brand") {
        return order === "asc"
          ? a.brand.localeCompare(b.brand, "cs")
          : b.brand.localeCompare(a.brand, "cs");
      }
      const pick = (r: BrandRankRow): number | null =>
        sortBy === "price" ? r.avgPricePerL
        : sortBy === "consumption" ? r.avgL100
        : sortBy === "liters" ? r.liters
        : sortBy === "totalCzk" ? r.totalCzk
        : r.count;
      const av = pick(a);
      const bv = pick(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return order === "asc" ? av - bv : bv - av;
    };
    return [...filtered].sort(cmp);
  }, [data, sortBy, order]);

  if (sorted.length === 0) return null;

  function toggleSort(key: SortKey) {
    if (sortBy === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      // sensible default direction per column
      setOrder(key === "brand" ? "asc" : "desc");
    }
  }

  const arrow = (key: SortKey) => (sortBy === key ? (order === "asc" ? " ↑" : " ↓") : "");

  return (
    <div className="card p-4 md:col-span-2 overflow-hidden">
      <div className="font-semibold mb-3">Žebříček pump</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase">
            <tr>
              <th
                className="text-left px-2 py-1 cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("brand")}
              >
                Pumpa{arrow("brand")}
              </th>
              <th
                className="text-right px-2 py-1 cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("count")}
              >
                Tankování{arrow("count")}
              </th>
              <th
                className="text-right px-2 py-1 cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("liters")}
              >
                Litry <U>l</U>{arrow("liters")}
              </th>
              <th
                className="text-right px-2 py-1 cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("totalCzk")}
              >
                Celkem <U>Kč</U>{arrow("totalCzk")}
              </th>
              <th
                className="text-right px-2 py-1 cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("price")}
              >
                Ø cena <U>Kč/l</U>{arrow("price")}
              </th>
              <th
                className="text-right px-2 py-1 cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort("consumption")}
              >
                Ø spotřeba <U>l/100</U>{arrow("consumption")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.brand} className="border-t border-slate-100">
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    <BrandLogo brand={r.brand} size={22} />
                    <span className="font-medium">{r.brand}</span>
                  </div>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {r.count}<U>×</U>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {r.liters.toFixed(1)}<U>l</U>
                </td>
                <td className="px-2 py-1 text-right tabular-nums font-medium">
                  {r.totalCzk > 0 ? <>{r.totalCzk.toLocaleString("cs-CZ")}<U>Kč</U></> : "—"}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {r.avgPricePerL != null ? <>{r.avgPricePerL.toFixed(2)}<U>Kč/l</U></> : "—"}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {r.avgL100 != null ? <>{r.avgL100.toFixed(2)}<U>l/100</U></> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Klikni na sloupec pro seřazení. Ceny i spotřeba se počítají jen z tankování s platnými daty.
      </p>
    </div>
  );
}

/* --------------------------- Region breakdown ------------------------------- */

type RegionRow = {
  region: string | null;
  country: string | null;
  liters: number;
  count: number;
};

/**
 * Kde jsem tankoval — podle regionu (pražské okresy, historické země, cizí státy).
 * Horizontální bar chart, seřazený sestupně.
 */
export function RegionBreakdown({ data }: { data: RegionRow[] }) {
  const prepped = useMemo(() => {
    return data
      .map((r) => ({
        label: regionLabel(r.region, r.country),
        liters: Number(r.liters.toFixed(1)),
        count: r.count,
      }))
      .filter((r) => r.label !== "—")
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 15);
  }, [data]);

  if (prepped.length === 0) return null;

  return (
    <div className="card p-4 overflow-hidden">
      <div className="font-semibold mb-3">Litry podle regionu</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={prepped}
            layout="vertical"
            margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} l`} />
            <Bar dataKey="liters" fill={PALETTE.primaryStrong} name="Litry"  isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Yearly chart ----------------------------------- */

type YearlyPoint = {
  year: string;
  km: number;
  liters: number;
  price: number;
};

/**
 * Roční graf: bar km + line Kč s dvojí osou.
 * Doplněk k ročnímu textovému souhrnu.
 */
export function YearlyChart({ data }: { data: YearlyPoint[] }) {
  if (data.length === 0) return null;
  return (
    <div className="card p-4 md:col-span-2 overflow-hidden">
      <div className="font-semibold mb-3">Roční přehled — km & Kč</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(v: number, name: string) => {
                if (name === "km") return [`${v.toLocaleString("cs-CZ")} km`, "Ujeto"];
                if (name === "Kč") return [`${v.toLocaleString("cs-CZ")} Kč`, "Náklady"];
                return [v, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="km" fill={PALETTE.primarySoft} name="km"  isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="price"
              stroke={PALETTE.danger}
              strokeWidth={2}
              name="Kč"
              dot
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Recent activity card --------------------------- */

type RecentData = {
  days30: { liters: number; price: number; km: number; count: number };
  days365: { liters: number; price: number; km: number; count: number };
};

/**
 * Rychlý přehled "co jsem tankoval posledních 30 / 365 dní".
 */
export function RecentActivity({ data }: { data: RecentData }) {
  const { days30, days365 } = data;
  if (days365.count === 0) return null;

  const cell = (label: string, value: string, dotColor: string) => (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        {label}
      </div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );

  const block = (title: string, badge: string, d: RecentData["days30"]) => (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-gradient-to-br from-sky-500/10 to-indigo-500/10 text-[10px] uppercase tracking-wide font-semibold text-sky-700 dark:text-sky-300 border border-sky-500/20">
          {title}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{badge}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cell("Tankování", String(d.count), "#F59E0B")}
        {cell("Litry", d.liters.toFixed(1), "#0EA5E9")}
        {cell("km", d.km.toLocaleString("cs-CZ"), "#7C3AED")}
        {cell("Kč", d.price.toLocaleString("cs-CZ"), "#10B981")}
      </div>
    </div>
  );

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/10 to-indigo-500/10 blur-2xl pointer-events-none" />
      <div className="flex items-center gap-2 mb-3 relative">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M8 1a7 7 0 1 0 7 7 .75.75 0 0 0-1.5 0A5.5 5.5 0 1 1 8 2.5a.75.75 0 0 0 0-1.5Zm.75 2.75a.75.75 0 0 0-1.5 0V8c0 .2.08.39.22.53l2.5 2.5a.75.75 0 0 0 1.06-1.06l-2.28-2.28V3.75Z" />
          </svg>
        </span>
        <div className="font-semibold">Poslední aktivita</div>
      </div>
      <div className="grid grid-cols-2 gap-6 relative">
        {block("30 dní", "měsíční pohled", days30)}
        {block("365 dní", "roční pohled", days365)}
      </div>
    </div>
  );
}
