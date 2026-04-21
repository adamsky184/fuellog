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
} from "recharts";
import { countryLabel } from "@/lib/regions";

/**
 * Brand colors — used for per-brand bar coloring and the BrandBadge component.
 * Unknown brands fall through to the neutral accent.
 */
export const BRAND_COLORS: Record<string, string> = {
  Shell: "#fbbf24",
  OMV: "#1d4ed8",
  Benzina: "#15803d",
  MOL: "#dc2626",
  EuroOil: "#0ea5e9",
  "Euro Oil": "#0ea5e9",
  Slovnaft: "#0284c7",
  ONO: "#f97316",
  Orlen: "#db2777",
  Agip: "#6d28d9",
  Lukoil: "#b91c1c",
  Total: "#e11d48",
  Globus: "#059669",
  Tesco: "#1e40af",
  Makro: "#0f766e",
};
const DEFAULT_BAR = "#0ea5e9";

function colorForBrand(brand: string): string {
  return BRAND_COLORS[brand] ?? DEFAULT_BAR;
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
    <div className="card p-4">
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
            <Tooltip />
            <Line type="monotone" dataKey="pricePerLiter" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Consumption trend ------------------------------ */

export function ConsumptionTrend({ data }: { data: { date: string; consumption: number }[] }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Vývoj spotřeby (L/100 km)</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip />
            <Line type="monotone" dataKey="consumption" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Brand breakdown -------------------------------- */

export function BrandBreakdown({ data }: { data: { brand: string; liters: number; count: number }[] }) {
  return (
    <div className="card p-4">
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
            <Tooltip />
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
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Litry podle státu</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="country" interval={0} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="liters" fill="#f59e0b" name="Litry" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* --------------------------- Top brands widget ------------------------------ */

export function TopBrands({ data }: { data: { brand: string; liters: number; count: number }[] }) {
  const top = [...data]
    .sort((a, b) => b.count - a.count || b.liters - a.liters)
    .slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Top 3 nejčastější pumpy</div>
      <ol className="space-y-2">
        {top.map((b, i) => (
          <li key={b.brand} className="flex items-center gap-3">
            <span className="text-xs w-5 text-slate-400 tabular-nums">{i + 1}.</span>
            <BrandBadge brand={b.brand} size={28} />
            <span className="font-medium">{b.brand}</span>
            <span className="ml-auto text-sm text-slate-500 tabular-nums">
              {b.count}× · {b.liters.toFixed(1)} l
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
