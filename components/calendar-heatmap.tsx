"use client";

/**
 * GitHub-style yearly heatmap of fill-up activity.
 *
 * Input: array of ISO dates (`YYYY-MM-DD`) with per-day liters or fill-up count.
 * Renders a 7×53 grid of 10×10 px cells. Intensity buckets are based on the
 * empirical max for the selected year so a sparse year still shows contrast.
 * All labels are Czech.
 */

import { useMemo, useState } from "react";

type DayBucket = {
  date: string; // YYYY-MM-DD
  count: number;
  liters: number;
  price: number;
};

const DOW_LABELS = ["Po", "", "St", "", "Pá", "", "Ne"]; // Monday-first, show every other

// Monday = 0 ... Sunday = 6
function mondayDow(d: Date): number {
  const js = d.getDay(); // 0..6, Sunday = 0
  return (js + 6) % 7;
}

function fmtCzech(date: string): string {
  const [y, m, d] = date.split("-");
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

export function CalendarHeatmap({
  rows,
  yearsAvailable,
}: {
  rows: Array<{ date: string | null; liters: number | null; total_price: number | null; is_baseline: boolean | null }>;
  yearsAvailable: number[];
}) {
  const latest = yearsAvailable[yearsAvailable.length - 1] ?? new Date().getFullYear();
  const [year, setYear] = useState<number>(latest);

  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const r of rows) {
      if (!r.date) continue;
      if (r.is_baseline) continue;
      if (!r.date.startsWith(`${year}-`)) continue;
      const cur = map.get(r.date) ?? { date: r.date, count: 0, liters: 0, price: 0 };
      cur.count += 1;
      cur.liters += Number(r.liters ?? 0);
      cur.price += Number(r.total_price ?? 0);
      map.set(r.date, cur);
    }
    return map;
  }, [rows, year]);

  const max = useMemo(() => {
    let m = 0;
    buckets.forEach((b) => {
      if (b.count > m) m = b.count;
    });
    return m;
  }, [buckets]);

  // Build the grid: first column starts on the Monday on or before Jan 1.
  const startOfYear = new Date(year, 0, 1);
  const firstMonday = new Date(startOfYear);
  firstMonday.setDate(firstMonday.getDate() - mondayDow(startOfYear));
  const endOfYear = new Date(year, 11, 31);
  const cells: Array<{ date: string; inYear: boolean; bucket: DayBucket | null }> = [];
  const cursor = new Date(firstMonday);
  while (cursor <= endOfYear || cells.length % 7 !== 0) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    cells.push({
      date: iso,
      inYear: cursor.getFullYear() === year,
      bucket: buckets.get(iso) ?? null,
    });
    cursor.setDate(cursor.getDate() + 1);
    if (cells.length > 53 * 7) break;
  }

  // Month label positions: first column whose first day is in that month.
  const monthLabels: Array<{ col: number; label: string }> = [];
  const MONTHS_CS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];
  for (let col = 0; col < Math.floor(cells.length / 7); col++) {
    const firstDay = cells[col * 7];
    const d = new Date(firstDay.date);
    if (d.getDate() <= 7 && d.getFullYear() === year) {
      monthLabels.push({ col, label: MONTHS_CS[d.getMonth()] });
    }
  }

  function colorFor(b: DayBucket | null, inYear: boolean): string {
    if (!inYear) return "bg-transparent";
    if (!b) return "bg-slate-100 dark:bg-slate-800";
    if (max <= 1) return "bg-sky-400 dark:bg-sky-500";
    const intensity = Math.min(1, b.count / Math.max(1, max));
    if (intensity >= 0.75) return "bg-sky-600 dark:bg-sky-400";
    if (intensity >= 0.5) return "bg-sky-500 dark:bg-sky-500";
    if (intensity >= 0.25) return "bg-sky-400 dark:bg-sky-600";
    return "bg-sky-200 dark:bg-sky-800";
  }

  const totals = useMemo(() => {
    let count = 0;
    let liters = 0;
    let price = 0;
    buckets.forEach((b) => {
      count += b.count;
      liters += b.liters;
      price += b.price;
    });
    return { count, liters, price };
  }, [buckets]);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-semibold">Kalendář tankování</div>
        <div className="flex items-center gap-2">
          <select
            className="input text-xs py-1 w-auto"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearsAvailable.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-xs muted">{totals.count}× · {totals.liters.toFixed(0)} L</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          {/* Month labels row */}
          <div className="flex gap-[2px] pl-6">
            {Array.from({ length: Math.floor(cells.length / 7) }).map((_, col) => {
              const label = monthLabels.find((m) => m.col === col)?.label ?? "";
              return (
                <div key={col} style={{ width: 10 }} className="text-left">
                  {label}
                </div>
              );
            })}
          </div>

          {/* Grid: Mon..Sun rows */}
          <div className="flex gap-[2px]">
            <div className="flex flex-col gap-[2px] pr-1 pt-[2px]">
              {DOW_LABELS.map((l, i) => (
                <div key={i} style={{ height: 10 }} className="text-right min-w-[14px]">
                  {l}
                </div>
              ))}
            </div>
            {Array.from({ length: Math.floor(cells.length / 7) }).map((_, col) => (
              <div key={col} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }).map((_, row) => {
                  const cell = cells[col * 7 + row];
                  if (!cell) return null;
                  const cls = colorFor(cell.bucket, cell.inYear);
                  const title = cell.inYear
                    ? cell.bucket
                      ? `${fmtCzech(cell.date)} — ${cell.bucket.count}× · ${cell.bucket.liters.toFixed(1)} L · ${cell.bucket.price.toFixed(0)} Kč`
                      : `${fmtCzech(cell.date)} — žádné tankování`
                    : "";
                  return (
                    <div
                      key={row}
                      className={`rounded-[2px] ${cls}`}
                      style={{ width: 10, height: 10 }}
                      title={title}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 pl-6 pt-1">
            <span>Méně</span>
            <span className="rounded-[2px] bg-slate-100 dark:bg-slate-800" style={{ width: 10, height: 10 }} />
            <span className="rounded-[2px] bg-sky-200 dark:bg-sky-800" style={{ width: 10, height: 10 }} />
            <span className="rounded-[2px] bg-sky-400 dark:bg-sky-600" style={{ width: 10, height: 10 }} />
            <span className="rounded-[2px] bg-sky-500" style={{ width: 10, height: 10 }} />
            <span className="rounded-[2px] bg-sky-600 dark:bg-sky-400" style={{ width: 10, height: 10 }} />
            <span>Více</span>
          </div>
        </div>
      </div>
    </div>
  );
}
