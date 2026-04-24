import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/brand-logo";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { formatLocation } from "@/lib/regions";

export default async function FillUpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("fill_up_stats_v")
    .select("*")
    .eq("vehicle_id", id)
    .order("date", { ascending: false });

  const totals = rows?.reduce(
    (acc, r) => {
      acc.liters += Number(r.liters ?? 0);
      acc.price += Number(r.total_price ?? 0);
      acc.km += Number(r.km_since_last ?? 0);
      acc.count += r.is_baseline ? 0 : 1;
      return acc;
    },
    { liters: 0, price: 0, km: 0, count: 0 }
  );

  const avgConsumption = totals && totals.km > 0 ? (totals.liters / totals.km) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Tankování" value={String(totals?.count ?? 0)} />
          <Stat label="Celkem km" value={formatNumber(totals?.km, 0)} />
          <Stat label="Celkem Kč" value={formatCurrency(totals?.price)} />
          <Stat label="Ø L/100 km" value={formatNumber(avgConsumption, 2)} />
        </div>
        <Link
          href={`/v/${id}/fill-ups/new`}
          className="btn-primary inline-flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Tankování
        </Link>
      </div>

      {!rows?.length ? (
        <div className="card p-8 text-center">
          <p className="text-slate-500 mb-4">Zatím žádná tankování.</p>
          <div className="flex gap-2 justify-center">
            <Link href={`/v/${id}/fill-ups/new`} className="btn-primary">Přidat první</Link>
            <Link href={`/v/${id}/import`} className="btn-secondary">Importovat z xlsx</Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <Th>Datum</Th>
                <Th right>Stav (km)</Th>
                <Th right>Ujeto</Th>
                <Th right>Litrů</Th>
                <Th right>Kč/l</Th>
                <Th right>Celkem</Th>
                <Th right>L/100</Th>
                <Th>Pumpa</Th>
                <Th>Místo</Th>
                <Th right>Akce</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id!} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <Td>
                    {formatDate(r.date)}
                    {r.is_highway && (
                      <span className="ml-2 inline-block rounded bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        D
                      </span>
                    )}
                  </Td>
                  <Td right>{formatNumber(r.odometer_km, 0)}</Td>
                  <Td right className="text-slate-500">{r.km_since_last ? formatNumber(r.km_since_last, 0) : "—"}</Td>
                  <Td right>{r.is_baseline ? "—" : formatNumber(r.liters, 2)}</Td>
                  <Td right>{r.price_per_liter ? formatNumber(r.price_per_liter, 2) : "—"}</Td>
                  <Td right>{r.total_price ? formatCurrency(r.total_price, r.currency ?? "CZK") : "—"}</Td>
                  <Td right className={consumptionClass(r.consumption_l_per_100km, avgConsumption)}>
                    {r.consumption_l_per_100km ? formatNumber(r.consumption_l_per_100km, 2) : "—"}
                  </Td>
                  <Td>
                    {r.station_brand ? (
                      <span className="inline-flex items-center gap-2">
                        <BrandLogo brand={r.station_brand} size={22} />
                        <span>{r.station_brand}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <span className="text-slate-600">
                      {formatLocation(r.city, r.region, r.country) || "—"}
                    </span>
                  </Td>
                  <Td right>
                    <Link
                      href={`/v/${id}/fill-ups/${r.id}/edit`}
                      className="text-sky-600 hover:underline text-xs inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Upravit
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-base">{value}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 ${right ? "text-right" : "text-left"} font-medium`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-3 py-2 ${right ? "text-right" : "text-left"} ${className}`}>{children}</td>;
}

/**
 * Color-code a fill-up's consumption vs the fleet average.
 * Green = meaningfully better, red = meaningfully worse, neutral otherwise.
 * Thresholds are intentionally wide (±10% better, +15% worse) so normal
 * variation between city/highway runs doesn't paint the table red.
 */
function consumptionClass(
  value: number | null | undefined,
  avg: number | null | undefined,
): string {
  if (value == null || avg == null || avg <= 0) return "";
  if (value < avg * 0.9) return "text-emerald-600 font-medium";
  if (value > avg * 1.15) return "text-rose-600 font-medium";
  return "";
}
