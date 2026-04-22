import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { countryLabel, regionLabel } from "@/lib/regions";
import { PrintButton } from "@/components/print-button";
import { Fuel } from "lucide-react";

/**
 * Server-rendered printable annual report. User opens /v/:id/report?year=YYYY,
 * then hits Tisk/Save as PDF. Everything is typography + tables — no charts
 * here because recharts adds a lot of weight for little value on paper.
 */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear() - 1;

  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, fuel_type")
    .eq("id", id)
    .maybeSingle();
  if (!vehicle) notFound();

  const { data: rowsRaw } = await supabase
    .from("fill_up_stats_v")
    .select(
      "date, odometer_km, liters, total_price, price_per_liter, consumption_l_per_100km, km_since_last, station_brand, country, region, is_baseline, is_highway",
    )
    .eq("vehicle_id", id)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date", { ascending: true });

  const rowsAll = rowsRaw ?? [];
  const rows = rowsAll.filter((r) => !r.is_baseline);

  const { data: yearsRows } = await supabase
    .from("fill_ups")
    .select("date")
    .eq("vehicle_id", id);
  const yearsSet = new Set<number>();
  for (const r of yearsRows ?? []) {
    if (r.date) yearsSet.add(parseInt(r.date.slice(0, 4), 10));
  }
  const years = Array.from(yearsSet).sort();

  const liters = rows.reduce((a, r) => a + Number(r.liters ?? 0), 0);
  const price = rows.reduce((a, r) => a + Number(r.total_price ?? 0), 0);
  const km = rows.reduce((a, r) => a + Number(r.km_since_last ?? 0), 0);
  const avgL100 = km > 0 ? (liters / km) * 100 : null;
  const avgPricePerL = liters > 0 ? price / liters : null;
  const czkPerKm = km > 0 ? price / km : null;

  const { data: maint } = await supabase
    .from("maintenance_entries")
    .select("id, date, kind, title, cost")
    .eq("vehicle_id", id)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date", { ascending: true });
  const maintCost = (maint ?? []).reduce((a, m) => a + Number(m.cost ?? 0), 0);

  // Brand leaderboard for the year
  const byBrand = new Map<string, { liters: number; price: number; count: number }>();
  for (const r of rows) {
    const key = r.station_brand?.trim() || "—";
    const e = byBrand.get(key) ?? { liters: 0, price: 0, count: 0 };
    e.liters += Number(r.liters ?? 0);
    e.price += Number(r.total_price ?? 0);
    e.count += 1;
    byBrand.set(key, e);
  }
  const brandRanking = Array.from(byBrand.entries())
    .map(([brand, v]) => ({ brand, ...v }))
    .sort((a, b) => b.liters - a.liters);

  // Country/region breakdown
  const byPlace = new Map<string, { liters: number; count: number }>();
  for (const r of rows) {
    const label = r.country && r.country !== "CZ"
      ? countryLabel(r.country)
      : regionLabel(r.region, r.country ?? "CZ");
    const e = byPlace.get(label) ?? { liters: 0, count: 0 };
    e.liters += Number(r.liters ?? 0);
    e.count += 1;
    byPlace.set(label, e);
  }
  const placeRanking = Array.from(byPlace.entries())
    .map(([place, v]) => ({ place, ...v }))
    .sort((a, b) => b.liters - a.liters);

  // Monthly
  const byMonth = new Map<string, { km: number; liters: number; price: number; count: number }>();
  for (const r of rows) {
    if (!r.date) continue;
    const m = r.date.slice(5, 7);
    const e = byMonth.get(m) ?? { km: 0, liters: 0, price: 0, count: 0 };
    e.km += Number(r.km_since_last ?? 0);
    e.liters += Number(r.liters ?? 0);
    e.price += Number(r.total_price ?? 0);
    e.count += 1;
    byMonth.set(m, e);
  }
  const MONTHS_CS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

  return (
    <div className="space-y-6 text-ink dark:text-ink print:text-black">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; page-break-inside: avoid; }
          header, footer { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Roční report</h1>
          <p className="muted text-sm">Tiskni jako PDF pomocí Ctrl/Cmd + P (nebo klikni).</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={`/v/${id}/report`} className="flex items-center gap-2">
            <select name="year" defaultValue={year} className="input py-1 text-xs w-auto">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary text-xs">Zobrazit</button>
          </form>
          <PrintButton />
        </div>
      </div>

      <header className="card p-6 print:p-0 print:border-0">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-accent text-white grid place-items-center">
            <Fuel className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xs muted uppercase tracking-wide">Moje tankování {year}</div>
            <div className="text-2xl font-semibold">{vehicle.name}</div>
            <div className="text-sm muted">
              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
              {vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}
              {` · ${vehicle.fuel_type}`}
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportStat label="Ujeto" value={`${formatNumber(km, 0)} km`} />
        <ReportStat label="Spotřebováno" value={`${formatNumber(liters, 1)} L`} />
        <ReportStat label="Utraceno" value={formatCurrency(price)} />
        <ReportStat label="Tankování" value={String(rows.length)} />
        <ReportStat label="Ø L/100 km" value={formatNumber(avgL100, 2)} />
        <ReportStat label="Ø Kč/l" value={formatNumber(avgPricePerL, 2)} />
        <ReportStat label="Kč/km" value={formatNumber(czkPerKm, 2)} />
        <ReportStat label="Servis" value={formatCurrency(maintCost)} />
      </section>

      {rows.length === 0 && (
        <div className="card p-8 text-center muted">V roce {year} zatím žádná tankování.</div>
      )}

      {rows.length > 0 && (
        <>
          <section className="card p-4">
            <div className="font-semibold mb-3">Po měsících</div>
            <table className="w-full text-sm">
              <thead className="text-xs muted uppercase">
                <tr>
                  <th className="text-left px-2 py-1">Měsíc</th>
                  <th className="text-right px-2 py-1">Tank.</th>
                  <th className="text-right px-2 py-1">km</th>
                  <th className="text-right px-2 py-1">L</th>
                  <th className="text-right px-2 py-1">Kč</th>
                  <th className="text-right px-2 py-1">Ø L/100</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS_CS.map((name, i) => {
                  const key = String(i + 1).padStart(2, "0");
                  const e = byMonth.get(key);
                  if (!e) {
                    return (
                      <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-1">{name}</td>
                        <td className="px-2 py-1 text-right muted">—</td>
                        <td className="px-2 py-1 text-right muted">—</td>
                        <td className="px-2 py-1 text-right muted">—</td>
                        <td className="px-2 py-1 text-right muted">—</td>
                        <td className="px-2 py-1 text-right muted">—</td>
                      </tr>
                    );
                  }
                  const l100 = e.km > 0 ? (e.liters / e.km) * 100 : null;
                  return (
                    <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-1 font-medium">{name}</td>
                      <td className="px-2 py-1 text-right">{e.count}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(e.km, 0)}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(e.liters, 1)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(e.price)}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(l100, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="card p-4">
            <div className="font-semibold mb-3">Podle pumpy</div>
            <table className="w-full text-sm">
              <thead className="text-xs muted uppercase">
                <tr>
                  <th className="text-left px-2 py-1">Pumpa</th>
                  <th className="text-right px-2 py-1">Tank.</th>
                  <th className="text-right px-2 py-1">L</th>
                  <th className="text-right px-2 py-1">Kč</th>
                  <th className="text-right px-2 py-1">Ø Kč/l</th>
                </tr>
              </thead>
              <tbody>
                {brandRanking.map((b) => (
                  <tr key={b.brand} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1 font-medium">{b.brand}</td>
                    <td className="px-2 py-1 text-right">{b.count}</td>
                    <td className="px-2 py-1 text-right">{formatNumber(b.liters, 1)}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(b.price)}</td>
                    <td className="px-2 py-1 text-right">
                      {b.liters > 0 ? formatNumber(b.price / b.liters, 2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card p-4">
            <div className="font-semibold mb-3">Podle kraje / státu</div>
            <table className="w-full text-sm">
              <thead className="text-xs muted uppercase">
                <tr>
                  <th className="text-left px-2 py-1">Místo</th>
                  <th className="text-right px-2 py-1">Tank.</th>
                  <th className="text-right px-2 py-1">L</th>
                </tr>
              </thead>
              <tbody>
                {placeRanking.map((p) => (
                  <tr key={p.place} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1">{p.place}</td>
                    <td className="px-2 py-1 text-right">{p.count}</td>
                    <td className="px-2 py-1 text-right">{formatNumber(p.liters, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {(maint ?? []).length > 0 && (
        <section className="card p-4">
          <div className="font-semibold mb-3">Servis v roce {year}</div>
          <table className="w-full text-sm">
            <thead className="text-xs muted uppercase">
              <tr>
                <th className="text-left px-2 py-1">Datum</th>
                <th className="text-left px-2 py-1">Typ</th>
                <th className="text-left px-2 py-1">Popis</th>
                <th className="text-right px-2 py-1">Cena</th>
              </tr>
            </thead>
            <tbody>
              {(maint ?? []).map((m) => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1">{formatDate(m.date)}</td>
                  <td className="px-2 py-1">{m.kind}</td>
                  <td className="px-2 py-1">{m.title ?? "—"}</td>
                  <td className="px-2 py-1 text-right">
                    {m.cost != null ? formatCurrency(m.cost) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="text-xs muted text-center pt-4">
        Vygenerováno FuelLogem · {formatDate(new Date())}
      </footer>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs muted">{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}
