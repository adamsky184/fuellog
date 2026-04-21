"use client";

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

/**
 * Brand colors — used for per-brand bar coloring.
 * Unknown brands fall through to the neutral accent.
 */
export const BRAND_COLORS: Record<string, string> = {
  Shell: "#fbbf24",      // yellow
  OMV: "#1d4ed8",        // blue
  Benzina: "#15803d",    // green
  MOL: "#dc2626",        // red
  EuroOil: "#0ea5e9",    // sky
  Slovnaft: "#0284c7",   // darker sky
  ONO: "#f97316",        // orange
  Orlen: "#db2777",      // pink
  Agip: "#6d28d9",       // violet
  Lukoil: "#b91c1c",     // deep red
};
const DEFAULT_BAR = "#0ea5e9";

function colorForBrand(brand: string): string {
  return BRAND_COLORS[brand] ?? DEFAULT_BAR;
}

export function PriceTrend({ data }: { data: { date: string; pricePerLiter: number }[] }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Vývoj ceny za litr</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
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

export function BrandBreakdown({ data }: { data: { brand: string; liters: number; count: number }[] }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Litry podle značky pumpy</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="brand" tick={{ fontSize: 10 }} />
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
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: colorForBrand(b.brand) }}
              aria-hidden
            />
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

export function CountryBreakdown({ data }: { data: { country: string; liters: number; count: number }[] }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Litry podle státu</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="country" tick={{ fontSize: 10 }} />
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
