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
  Legend,
} from "recharts";

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
            <Bar dataKey="liters" fill="#0ea5e9" name="Litry" />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
