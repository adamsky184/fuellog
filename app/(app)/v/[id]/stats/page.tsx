import { createClient } from "@/lib/supabase/server";
import {
  BrandBreakdown,
  ConsumptionTrend,
  CountryBreakdown,
  PriceTrend,
} from "@/components/stats-charts";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rowsRaw } = await supabase
    .from("fill_up_stats_v")
    .select("date, odometer_km, liters, total_price, price_per_liter, consumption_l_per_100km, km_since_last, station_brand, country, region, is_baseline")
    .eq("vehicle_id", id)
    .order("date", { ascending: true });

  const rows = (rowsRaw ?? []).filter((r) => !r.is_baseline);

  // Totals
  const totalLiters = rows.reduce((a, r) => a + Number(r.liters ?? 0), 0);
  const totalPrice = rows.reduce((a, r) => a + Number(r.total_price ?? 0), 0);
  const totalKm = rows.reduce((a, r) => a + Number(r.km_since_last ?? 0), 0);
  const avgL100 = totalKm > 0 ? (totalLiters / totalKm) * 100 : null;
  const avgPricePerL = totalLiters > 0 ? totalPrice / totalLiters : null;
  const czkPerKm = totalKm > 0 ? totalPrice / totalKm : null;

  // Series
  const priceSeries = rows
    .filter((r) => r.price_per_liter != null && r.date)
    .map((r) => ({ date: r.date!.slice(0, 7), pricePerLiter: Number(r.price_per_liter) }));

  const consumptionSeries = rows
    .filter((r) => r.consumption_l_per_100km != null && r.date)
    .map((r) => ({ date: r.date!.slice(0, 7), consumption: Number(r.consumption_l_per_100km) }));

  // Brand
  const byBrand = new Map<string, { liters: number; count: number }>();
  for (const r of rows) {
    const key = r.station_brand?.trim() || "—";
    const e = byBrand.get(key) ?? { liters: 0, count: 0 };
    e.liters += Number(r.liters ?? 0);
    e.count += 1;
    byBrand.set(key, e);
  }
  const brandData = Array.from(byBrand.entries())
    .map(([brand, v]) => ({ brand, ...v, liters: Number(v.liters.toFixed(2)) }))
    .sort((a, b) => b.liters - a.liters);

  // Country
  const byCountry = new Map<string, { liters: number; count: number }>();
  for (const r of rows) {
    const key = r.country ?? "—";
    const e = byCountry.get(key) ?? { liters: 0, count: 0 };
    e.liters += Number(r.liters ?? 0);
    e.count += 1;
    byCountry.set(key, e);
  }
  const countryData = Array.from(byCountry.entries())
    .map(([country, v]) => ({ country, ...v, liters: Number(v.liters.toFixed(2)) }))
    .sort((a, b) => b.liters - a.liters);

  // Yearly
  const byYear = new Map<string, { km: number; liters: number; price: number; count: number }>();
  for (const r of rows) {
    if (!r.date) continue;
    const y = r.date.slice(0, 4);
    const e = byYear.get(y) ?? { km: 0, liters: 0, price: 0, count: 0 };
    e.km += Number(r.km_since_last ?? 0);
    e.liters += Number(r.liters ?? 0);
    e.price += Number(r.total_price ?? 0);
    e.count += 1;
    byYear.set(y, e);
  }
  const yearly = Array.from(byYear.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Celkem km" value={formatNumber(totalKm, 0)} />
        <Stat label="Celkem litrů" value={formatNumber(totalLiters, 1)} />
        <Stat label="Celkem Kč" value={formatCurrency(totalPrice)} />
        <Stat label="Ø L/100 km" value={formatNumber(avgL100, 2)} />
        <Stat label="Ø Kč/l" value={formatNumber(avgPricePerL, 2)} />
        <Stat label="Kč/km" value={formatNumber(czkPerKm, 2)} />
        <Stat label="Počet tankování" value={String(rows.length)} />
        <Stat label="Pumpa №1" value={brandData[0]?.brand ?? "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <PriceTrend data={priceSeries} />
        <ConsumptionTrend data={consumptionSeries} />
        <BrandBreakdown data={brandData.slice(0, 10)} />
        <CountryBreakdown data={countryData} />
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-3">Roční souhrn</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
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
                <tr key={y} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-medium">{y}</td>
                  <td className="px-2 py-1 text-right">{formatNumber(e.km, 0)}</td>
                  <td className="px-2 py-1 text-right">{formatNumber(e.liters, 1)}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(e.price)}</td>
                  <td className="px-2 py-1 text-right">{e.count}</td>
                  <td className="px-2 py-1 text-right">{e.liters > 0 ? formatNumber(e.price / e.liters, 2) : "—"}</td>
                  <td className="px-2 py-1 text-right">{e.km > 0 ? formatNumber((e.liters / e.km) * 100, 2) : "—"}</td>
                  <td className="px-2 py-1 text-right">{e.km > 0 ? formatNumber(e.price / e.km, 2) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}
