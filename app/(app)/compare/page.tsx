import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { CompareControls } from "@/components/compare-controls";

/**
 * v2.12.0 — side-by-side vehicle comparison.
 *
 * Picks 2–4 vehicles via ?vehicles=v1,v2,v3 and renders matching
 * metrics in a single row-per-metric layout (km, litry, Kč, Ø
 * spotřeba, Kč/km, počet tankování, …) so the user can eyeball
 * differences at a glance.
 *
 * Server component — fetches per-vehicle aggregates once, no charts,
 * no heavy client JS.
 */

type VehicleRow = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  fuel_type: string;
  color: string | null;
  garage_id: string | null;
};

type Stats = {
  km: number;
  liters: number;
  priceCzk: number;
  count: number;
  firstDate: string | null;
  lastDate: string | null;
  avgL100: number | null;
  czkPerKm: number | null;
  czkPerL: number | null;
};

async function loadStatsForVehicle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vehicleId: string,
): Promise<Stats> {
  const empty: Stats = {
    km: 0,
    liters: 0,
    priceCzk: 0,
    count: 0,
    firstDate: null,
    lastDate: null,
    avgL100: null,
    czkPerKm: null,
    czkPerL: null,
  };

  const PAGE = 1000;
  type R = {
    date: string | null;
    liters: number | null;
    total_price: number | null;
    total_price_czk: number | null;
    km_since_last: number | null;
    is_baseline: boolean | null;
  };
  const all: R[] = [];
  for (let from = 0; from < 200000; from += PAGE) {
    const { data: page } = await supabase
      .from("fill_up_stats_v")
      .select("date, liters, total_price, total_price_czk, km_since_last, is_baseline")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (!page || page.length === 0) break;
    all.push(...(page as R[]));
    if (page.length < PAGE) break;
  }

  const real = all.filter((r) => !r.is_baseline);
  if (real.length === 0) return empty;

  let liters = 0, priceCzk = 0, km = 0;
  for (const r of real) {
    liters += Number(r.liters ?? 0);
    priceCzk += Number(r.total_price_czk ?? r.total_price ?? 0);
    km += Number(r.km_since_last ?? 0);
  }
  const dates = real.map((r) => r.date).filter((x): x is string => !!x).sort();
  return {
    km,
    liters,
    priceCzk,
    count: real.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    avgL100: km > 0 ? (liters / km) * 100 : null,
    czkPerKm: km > 0 ? priceCzk / km : null,
    czkPerL: liters > 0 ? priceCzk / liters : null,
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicles?: string }>;
}) {
  const sp = await searchParams;
  const ids = (sp.vehicles ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);

  const supabase = await createClient();
  const { data: allVehicles } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, fuel_type, color, garage_id, archived_at")
    .order("created_at", { ascending: false });
  const vehicles = ((allVehicles ?? []) as (VehicleRow & { archived_at: string | null })[])
    .filter((v) => !v.archived_at);

  const selected = ids
    .map((id) => vehicles.find((v) => v.id === id))
    .filter((v): v is VehicleRow & { archived_at: string | null } => !!v);

  const statsList = await Promise.all(
    selected.map((v) => loadStatsForVehicle(supabase, v.id)),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold uppercase tracking-tight inline-flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-accent" />
          Porovnání vozů
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Vyber 2–4 vozy a podívej se na klíčové ukazatele vedle sebe.
        </p>
      </div>

      <CompareControls
        vehicles={vehicles.map((v) => ({
          id: v.id,
          name: v.name,
          subtitle: [v.make, v.model, v.year].filter(Boolean).join(" "),
        }))}
        selected={ids}
      />

      {selected.length < 2 ? (
        <div className="card p-8 text-center text-slate-500 space-y-2">
          <Plus className="h-6 w-6 mx-auto text-slate-400" />
          <div>Zatím vybráno {selected.length} vozidlo. Vyber alespoň dvě nahoře.</div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-3 py-3 font-medium">Metrika</th>
                {selected.map((v) => (
                  <th key={v.id} className="text-right px-3 py-3 font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      {v.color && (
                        <span
                          aria-hidden
                          className="inline-block w-2 h-6 rounded-sm shrink-0"
                          style={{ backgroundColor: v.color }}
                        />
                      )}
                      <div className="text-left">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{v.name}</div>
                        <div className="text-[11px] font-normal normal-case text-slate-400">
                          {[v.make, v.model, v.year].filter(Boolean).join(" ")}
                        </div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row
                label="Tankování (×)"
                values={statsList.map((s) => s.count.toLocaleString("cs-CZ"))}
                hint={statsList.map((s) => "")}
              />
              <Row
                label="Ujeto (km)"
                values={statsList.map((s) => `${formatNumber(s.km, 0)}`)}
              />
              <Row
                label="Litrů"
                values={statsList.map((s) => `${formatNumber(s.liters, 1)}`)}
              />
              <Row
                label="Útrata (Kč)"
                values={statsList.map((s) => formatCurrency(s.priceCzk))}
                strong
              />
              <Row
                label="Ø spotřeba (l/100)"
                values={statsList.map((s) => s.avgL100 != null ? formatNumber(s.avgL100, 2) : "—")}
                bestLow={statsList.map((s) => s.avgL100)}
              />
              <Row
                label="Kč / km"
                values={statsList.map((s) => s.czkPerKm != null ? `${formatNumber(s.czkPerKm, 2)} Kč` : "—")}
                bestLow={statsList.map((s) => s.czkPerKm)}
              />
              <Row
                label="Ø cena litru"
                values={statsList.map((s) => s.czkPerL != null ? `${formatNumber(s.czkPerL, 2)} Kč/l` : "—")}
                bestLow={statsList.map((s) => s.czkPerL)}
              />
              <Row
                label="První tankování"
                values={statsList.map((s) => s.firstDate ?? "—")}
                muted
              />
              <Row
                label="Poslední tankování"
                values={statsList.map((s) => s.lastDate ?? "—")}
                muted
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  values,
  hint,
  strong,
  muted,
  bestLow,
}: {
  label: string;
  values: string[];
  hint?: string[];
  strong?: boolean;
  muted?: boolean;
  /** Optional: numeric source values; the lowest gets a "best" highlight. */
  bestLow?: (number | null)[];
}) {
  let bestIdx = -1;
  if (bestLow) {
    let bestVal = Infinity;
    bestLow.forEach((v, i) => {
      if (v != null && v < bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
  }

  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-2.5 text-right tabular-nums ${
            muted ? "text-slate-400" : strong ? "font-semibold text-slate-900 dark:text-slate-100" : ""
          } ${i === bestIdx ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}
        >
          {v}
          {i === bestIdx && (
            <span className="ml-1 text-[10px] font-normal opacity-70">★</span>
          )}
          {hint?.[i] && <div className="text-[10px] text-slate-400 font-normal">{hint[i]}</div>}
        </td>
      ))}
    </tr>
  );
}
