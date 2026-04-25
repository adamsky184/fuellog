/**
 * v2.9.12 — Roční souhrn — sortable table.
 *
 * Was a static server-rendered table; promoted to a client component so
 * every column is sortable (default: rok desc — newest first) and every
 * numeric value carries an explicit unit suffix.
 */
"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

type YearEntry = {
  km: number;
  liters: number;
  price: number;
  count: number;
};

type SortKey = "year" | "km" | "liters" | "price" | "count" | "kcL" | "l100" | "kcKm";

function U({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-normal">
      {children}
    </span>
  );
}

export function YearlySummaryTable({
  rows,
}: {
  rows: [string, YearEntry][];
}) {
  const [sortBy, setSortBy] = useState<SortKey>("year");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const enriched = rows.map(([y, e]) => ({
      year: y,
      ...e,
      kcL: e.liters > 0 ? e.price / e.liters : null,
      l100: e.km > 0 ? (e.liters / e.km) * 100 : null,
      kcKm: e.km > 0 ? e.price / e.km : null,
    }));
    return [...enriched].sort((a, b) => {
      const dir = order === "asc" ? 1 : -1;
      if (sortBy === "year") return dir * a.year.localeCompare(b.year);
      const av = a[sortBy] as number | null;
      const bv = b[sortBy] as number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return dir * (av - bv);
    });
  }, [rows, sortBy, order]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSortBy(k);
      // year and counts default desc; consumption defaults asc (lower = better)
      setOrder(k === "l100" || k === "kcL" || k === "kcKm" ? "asc" : "desc");
    }
  }
  const arrow = (k: SortKey) => (sortBy === k ? (order === "asc" ? " ↑" : " ↓") : "");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase">
          <tr>
            <Th onClick={() => toggleSort("year")}>Rok{arrow("year")}</Th>
            <Th right onClick={() => toggleSort("km")}>
              km{arrow("km")}
            </Th>
            <Th right onClick={() => toggleSort("liters")}>
              Litry <U>l</U>{arrow("liters")}
            </Th>
            <Th right onClick={() => toggleSort("price")}>
              Kč{arrow("price")}
            </Th>
            <Th right onClick={() => toggleSort("count")}>
              Tankování{arrow("count")}
            </Th>
            <Th right onClick={() => toggleSort("kcL")}>
              Ø <U>Kč/l</U>{arrow("kcL")}
            </Th>
            <Th right onClick={() => toggleSort("l100")}>
              Ø <U>l/100</U>{arrow("l100")}
            </Th>
            <Th right onClick={() => toggleSort("kcKm")}>
              <U>Kč/km</U>{arrow("kcKm")}
            </Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.year} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-2 py-1 font-medium">{r.year}</td>
              <td className="px-2 py-1 text-right tabular-nums">
                {formatNumber(r.km, 0)}<U>km</U>
              </td>
              <td className="px-2 py-1 text-right tabular-nums">
                {formatNumber(r.liters, 1)}<U>l</U>
              </td>
              <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(r.price)}</td>
              <td className="px-2 py-1 text-right tabular-nums">
                {r.count}<U>×</U>
              </td>
              <td className="px-2 py-1 text-right tabular-nums">
                {r.kcL != null ? <>{formatNumber(r.kcL, 2)}<U>Kč/l</U></> : "—"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums">
                {r.l100 != null ? <>{formatNumber(r.l100, 2)}<U>l/100</U></> : "—"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums">
                {r.kcKm != null ? <>{formatNumber(r.kcKm, 2)}<U>Kč/km</U></> : "—"}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-2 py-4 text-center text-slate-500">
                Žádná data v tomto období.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  right,
  onClick,
}: {
  children: React.ReactNode;
  right?: boolean;
  onClick: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-2 py-1 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
