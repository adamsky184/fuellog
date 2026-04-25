import Link from "next/link";
import {
  Coins,
  Droplet,
  Fuel,
  Gauge,
  Hash,
  Pencil,
  Plus,
  Route,
} from "lucide-react";
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
      {/* TACHOMETR / UJETO / TANKOVÁNÍ / CELKEM Kč / CELKEM L / Ø spotřeba */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-sm">
        <Stat label="Tachometr"  value={formatNumber(currentOdometer, 0)}    unit="km"     tone="km"    icon={<Gauge className="h-3.5 w-3.5" />} />
        <Stat label="Ujeto"      value={formatNumber(totals?.km, 0)}          unit="km"     tone="km"    icon={<Route className="h-3.5 w-3.5" />} />
        <Stat label="Tankování"  value={`${totals?.count ?? 0}×`}                            tone="count" icon={<Hash className="h-3.5 w-3.5" />} />
        <Stat label="Celkem"     value={formatNumber(totals?.price, 0)}       unit="Kč"     tone="money" icon={<Coins className="h-3.5 w-3.5" />} />
        <Stat label="Celkem"     value={formatNumber(totals?.liters, 1)}      unit="l"      tone="fuel"  icon={<Droplet className="h-3.5 w-3.5" />} />
        <Stat label="Ø spotřeba" value={formatNumber(avgConsumption, 2)}      unit="l/100"  tone="fuel"  icon={<Fuel className="h-3.5 w-3.5" />} />
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
          {/* Mobile: card per fill-up. */}
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
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-medium">{formatDate(r.date)}</span>
                        {hwLabel && (
                          <span className="inline-block rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                            {hwLabel}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatNumber(r.odometer_km, 0)}<UnitSuffix>km</UnitSuffix>
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
                        <span className="font-medium">{formatNumber(r.liters, 2)}<UnitSuffix>l</UnitSuffix></span>
                      </span>
                    )}
                    {r.km_since_last && (
                      <span>
                        <span className="text-slate-400">Ujeto:</span>{" "}
                        <span className="font-medium">{formatNumber(r.km_since_last, 0)}<UnitSuffix>km</UnitSuffix></span>
                      </span>
                    )}
                    {r.consumption_l_per_100km && (
                      <span>
                        <span className="text-slate-400">Spotřeba:</span>{" "}
                        <span className={consumptionClass(r.consumption_l_per_100km, avgConsumption) || "font-medium"}>
                          {formatNumber(r.consumption_l_per_100km, 2)}<UnitSuffix>l/100</UnitSuffix>
                        </span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/*
            Desktop table — v2.9.5
            ─ Folded the standalone "Adresa" column INTO the "Místo" cell as
              a small grey second line. That removes the column that was
              forcing horizontal scroll, no min-width hack needed.
            ─ Outer card has no overflow rule. No inner overflow wrapper at
              all — sticky <th> cells anchor directly against page scroll.
            ─ Per-th sticky (each cell sticky top-0 z-20) is the most
              cross-browser-reliable pattern.
          */}
          <div className="card hidden sm:block">
            <table className="w-full text-[13px]">
              <thead className="text-slate-600 dark:text-slate-300 text-xs uppercase">
                <tr>
                  <Th sticky>Datum</Th>
                  <Th sticky right unit="km">Stav</Th>
                  <Th sticky right unit="km">Ujeto</Th>
                  <Th sticky right unit="l">Litrů</Th>
                  <Th sticky right unit="Kč/l">Cena</Th>
                  <Th sticky right unit="Kč">Celkem</Th>
                  <Th sticky right unit="l/100">Spotřeba</Th>
                  <Th sticky>Pumpa</Th>
                  <Th sticky>Místo</Th>
                  <Th sticky right>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const hwLabel = highwayLabel(r.address, r.is_highway);
                  const flag = countryFlag(r.country);
                  return (
                    <tr key={r.id!} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
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
                      <Td right>
                        {formatNumber(r.odometer_km, 0)}<UnitSuffix>km</UnitSuffix>
                      </Td>
                      <Td right className="text-slate-500">
                        {r.km_since_last ? <>{formatNumber(r.km_since_last, 0)}<UnitSuffix>km</UnitSuffix></> : "—"}
                      </Td>
                      <Td right>
                        {r.is_baseline ? "—" : <>{formatNumber(r.liters, 2)}<UnitSuffix>l</UnitSuffix></>}
                      </Td>
                      <Td right>
                        {r.price_per_liter ? <>{formatNumber(r.price_per_liter, 2)}<UnitSuffix>{(r.currency ?? "CZK")}/l</UnitSuffix></> : "—"}
                      </Td>
                      <Td right>{r.total_price ? formatCurrency(r.total_price, r.currency ?? "CZK") : "—"}</Td>
                      <Td right className={consumptionClass(r.consumption_l_per_100km, avgConsumption)}>
                        {r.consumption_l_per_100km ? <>{formatNumber(r.consumption_l_per_100km, 2)}<UnitSuffix>l/100</UnitSuffix></> : "—"}
                      </Td>
                      <Td>
                        {r.station_brand ? (
                          <span className="inline-flex items-center gap-2">
                            <BrandLogo brand={r.station_brand} size={20} />
                            <span className="truncate">{r.station_brand}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-col leading-tight">
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                            {flag && <span aria-hidden>{flag}</span>}
                            <span className="truncate">{formatLocation(r.city, r.region, r.country) || "—"}</span>
                          </span>
                          {stripHighwayPrefix(r.address) && (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate">
                              {stripHighwayPrefix(r.address)}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td right>
                        <Link
                          href={`/v/${id}/fill-ups/${r.id}/edit`}
                          aria-label="Upravit tankování"
                          className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

function UnitSuffix({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-normal">
      {children}
    </span>
  );
}

type StatTone = "km" | "fuel" | "money" | "count";
const TONE_BG: Record<StatTone, string> = {
  km:    "bg-sky-50/60 dark:bg-sky-950/20",
  fuel:  "bg-amber-50/60 dark:bg-amber-950/20",
  money: "bg-emerald-50/60 dark:bg-emerald-950/20",
  count: "bg-slate-50/60 dark:bg-slate-800/40",
};
const TONE_ICON: Record<StatTone, { bg: string; fg: string; ring: string }> = {
  km:    { bg: "bg-sky-100 dark:bg-sky-900/40",       fg: "text-sky-600 dark:text-sky-300",       ring: "ring-sky-200/60 dark:ring-sky-800/60" },
  fuel:  { bg: "bg-amber-100 dark:bg-amber-900/40",   fg: "text-amber-600 dark:text-amber-300",   ring: "ring-amber-200/60 dark:ring-amber-800/60" },
  money: { bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-200/60 dark:ring-emerald-800/60" },
  count: { bg: "bg-slate-100 dark:bg-slate-700/60",   fg: "text-slate-600 dark:text-slate-300",   ring: "ring-slate-200/60 dark:ring-slate-700/60" },
};

function Stat({
  label,
  value,
  unit,
  tone,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: StatTone;
  icon?: React.ReactNode;
}) {
  const bg = tone ? TONE_BG[tone] : "";
  const ic = tone ? TONE_ICON[tone] : null;
  return (
    <div className={`card p-2.5 sm:p-3 ${bg}`}>
      <div className="flex items-center gap-1.5">
        {icon && ic && (
          <span className={`inline-flex items-center justify-center h-5 w-5 rounded-md ${ic.bg} ${ic.fg} ring-1 ${ic.ring}`}>
            {icon}
          </span>
        )}
        <div className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      </div>
      <div className="font-semibold text-base sm:text-lg mt-1 leading-tight">
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
  sticky,
  className = "",
}: {
  children: React.ReactNode;
  right?: boolean;
  unit?: string;
  /** v2.9.4 — per-cell sticky for the header row. */
  sticky?: boolean;
  className?: string;
}) {
  const stickyCls = sticky
    ? "sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur"
    : "";
  return (
    <th className={`px-2 py-2 ${right ? "text-right" : "text-left"} font-medium whitespace-nowrap ${stickyCls} ${className}`}>
      {children}
      {unit && (
        <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-normal normal-case">
          ({unit})
        </span>
      )}
    </th>
  );
}
function Td({
  children,
  right,
  className = "",
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return <td className={`px-2 py-2 ${right ? "text-right" : "text-left"} ${className}`}>{children}</td>;
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
