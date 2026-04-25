import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/brand-logo";
import { DueReminders } from "@/components/due-reminders";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { formatLocation } from "@/lib/regions";
import { countryFlag } from "@/lib/country-flags";

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
      // v2.8.0: aggregate in CZK so foreign-currency rows don't skew the total.
      acc.price += Number(r.total_price_czk ?? r.total_price ?? 0);
      acc.km += Number(r.km_since_last ?? 0);
      acc.count += r.is_baseline ? 0 : 1;
      return acc;
    },
    { liters: 0, price: 0, km: 0, count: 0 }
  );

  const avgConsumption = totals && totals.km > 0 ? (totals.liters / totals.km) * 100 : null;
  const currentOdometer = rows && rows.length > 0
    ? Math.max(...rows.map((r) => Number(r.odometer_km ?? 0)))
    : 0;

  return (
    <div className="space-y-4">
      {/* v2.9.1 — six-tile strip in the order Adam asked for:
          TACHOMETR / UJETO / TANKOVÁNÍ / CELKEM Kč / CELKEM L / Ø spotřeba */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-sm">
        <Stat label="Tachometr"    value={formatNumber(currentOdometer, 0)}        unit="km"      tone="km" />
        <Stat label="Ujeto"        value={formatNumber(totals?.km, 0)}              unit="km"      tone="km" />
        <Stat label="Tankování"    value={`${totals?.count ?? 0}×`}                                 tone="count" />
        <Stat label="Celkem"       value={formatNumber(totals?.price, 0)}           unit="Kč"      tone="money" />
        <Stat label="Celkem"       value={formatNumber(totals?.liters, 1)}          unit="L"       tone="fuel" />
        <Stat label="Ø spotřeba"   value={formatNumber(avgConsumption, 2)}          unit="L/100"   tone="fuel" />
      </div>
      <div className="flex justify-end">
        <Link
          href={`/v/${id}/fill-ups/new`}
          className="btn-primary inline-flex items-center justify-center gap-1 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Tankování
        </Link>
      </div>

      <DueReminders vehicleId={id} showVehicleName={false} />

      {!rows?.length ? (
        <div className="card p-8 text-center">
          <p className="text-slate-500 mb-4">Zatím žádná tankování.</p>
          <div className="flex gap-2 justify-center">
            <Link href={`/v/${id}/fill-ups/new`} className="btn-primary">Přidat první</Link>
            <Link href={`/v/${id}/import`} className="btn-secondary">Importovat z xlsx</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: card per fill-up. Desktop keeps the dense table. */}
          <div className="sm:hidden space-y-2">
            {rows.map((r) => {
              const hwLabel = highwayLabel(r.address, r.is_highway);
              const flag = countryFlag(r.country);
              return (
                <Link
                  key={r.id!}
                  href={`/v/${id}/fill-ups/${r.id}/edit`}
                  className="card p-3 block active:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* v2.9.1 — keep date + highway badge on a single line. */}
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-medium">{formatDate(r.date)}</span>
                        {hwLabel && (
                          <span className="inline-block rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                            {hwLabel}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatNumber(r.odometer_km, 0)} km
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-700 min-w-0">
                        {r.station_brand ? (
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <BrandLogo brand={r.station_brand} size={18} />
                            <span className="truncate">{r.station_brand}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">bez značky</span>
                        )}
                        {(r.city || r.region || stripHighwayPrefix(r.address)) && (
                          <span className="text-slate-500 text-xs truncate">
                            · {flag && <span className="mr-0.5">{flag}</span>}
                            {[stripHighwayPrefix(r.address), formatLocation(r.city, r.region, r.country)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">
                        {r.total_price ? formatCurrency(r.total_price, r.currency ?? "CZK") : "—"}
                      </div>
                      {r.price_per_liter && (
                        <div className="text-xs text-slate-500">
                          {formatNumber(r.price_per_liter, 2)} {r.currency ?? "CZK"}/l
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                    {!r.is_baseline && r.liters && (
                      <span>
                        <span className="text-slate-400">Litry:</span>{" "}
                        <span className="font-medium">{formatNumber(r.liters, 2)}</span>
                      </span>
                    )}
                    {r.km_since_last && (
                      <span>
                        <span className="text-slate-400">Ujeto:</span>{" "}
                        <span className="font-medium">{formatNumber(r.km_since_last, 0)} km</span>
                      </span>
                    )}
                    {r.consumption_l_per_100km && (
                      <span>
                        <span className="text-slate-400">Spotřeba:</span>{" "}
                        <span className={consumptionClass(r.consumption_l_per_100km, avgConsumption) || "font-medium"}>
                          {formatNumber(r.consumption_l_per_100km, 2)} L/100
                        </span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop/tablet table.
              v2.9.1 — the previous `overflow-x-auto` parent established a
              new scrolling context, which silently broke `position: sticky`
              on <thead>. Splitting the card into a non-scrolling outer
              shell and a scroll-only-on-x inner wrapper keeps the rounded
              card decoration AND lets sticky resolve against page scroll.
              `style={{ overflowY: "visible" }}` is explicit about not
              clipping the y-axis even though we set overflow-x:auto. */}
          <div className="card hidden sm:block">
            <div
              className="rounded-2xl"
              style={{ overflowX: "auto", overflowY: "visible" }}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur text-slate-600 dark:text-slate-300 text-xs uppercase">
                  <tr>
                    <Th>Datum</Th>
                    <Th right unit="km">Stav</Th>
                    <Th right unit="km">Ujeto</Th>
                    <Th right unit="L">Litrů</Th>
                    <Th right unit="Kč/l">Cena</Th>
                    <Th right unit="Kč">Celkem</Th>
                    <Th right unit="L/100">Spotřeba</Th>
                    <Th>Pumpa</Th>
                    <Th>Místo</Th>
                    <Th>Adresa</Th>
                    <Th right>Akce</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const hwLabel = highwayLabel(r.address, r.is_highway);
                    const flag = countryFlag(r.country);
                    return (
                      <tr key={r.id!} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <Td>
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <span>{formatDate(r.date)}</span>
                            {hwLabel && (
                              <span className="inline-block rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                                {hwLabel}
                              </span>
                            )}
                          </span>
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
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            {flag && <span aria-hidden>{flag}</span>}
                            <span>{formatLocation(r.city, r.region, r.country) || "—"}</span>
                          </span>
                        </Td>
                        <Td>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {stripHighwayPrefix(r.address) || "—"}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ----- helpers ----- */

function highwayLabel(address: string | null | undefined, isHighway: boolean | null | undefined): string | null {
  if (!isHighway) return null;
  if (!address) return "D";
  const m = String(address).match(/^D\s?(\d{1,2})\b/i);
  return m ? `D${m[1]}` : "D";
}

function stripHighwayPrefix(address: string | null | undefined): string {
  if (!address) return "";
  return String(address).replace(/^D\s?\d{1,2}\s*·?\s*/i, "").trim();
}

type StatTone = "km" | "fuel" | "money" | "count";
const TONE_BG: Record<StatTone, string> = {
  km: "bg-sky-50/60 dark:bg-sky-950/20",
  fuel: "bg-amber-50/60 dark:bg-amber-950/20",
  money: "bg-emerald-50/60 dark:bg-emerald-950/20",
  count: "bg-slate-50/60 dark:bg-slate-800/40",
};

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: StatTone;
}) {
  const bg = tone ? TONE_BG[tone] : "";
  return (
    <div className={`card p-2.5 sm:p-3 ${bg}`}>
      <div className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold text-base sm:text-lg mt-0.5 leading-tight">
        <span className="tabular-nums">{value}</span>
        {unit && (
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  right,
  unit,
}: {
  children: React.ReactNode;
  right?: boolean;
  unit?: string;
}) {
  return (
    <th className={`px-3 py-2 ${right ? "text-right" : "text-left"} font-medium`}>
      {children}
      {/* v2.9.1 — small grey unit suffix in every header so the table is
          self-explanatory even after scrolling. */}
      {unit && (
        <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-normal normal-case">
          ({unit})
        </span>
      )}
    </th>
  );
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-3 py-2 ${right ? "text-right" : "text-left"} ${className}`}>{children}</td>;
}

function consumptionClass(
  value: number | null | undefined,
  avg: number | null | undefined,
): string {
  if (value == null || avg == null || avg <= 0) return "";
  if (value < avg * 0.9) return "text-emerald-600 font-medium";
  if (value > avg * 1.15) return "text-rose-600 font-medium";
  return "";
}
