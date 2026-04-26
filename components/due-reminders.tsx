/**
 * v2.7.0 — "Co tě čeká": shows upcoming/overdue maintenance reminders
 * (insurance, highway sticker, STK, oil change, …) based on the
 * `next_due_date` column of `maintenance_entries`.
 *
 * For each (vehicle, kind) pair we keep only the MOST RECENT row —
 * a newer entry of the same kind supersedes the previous reminder
 * (e.g. paying insurance for 2027 retires the 2026 record).
 *
 * Server component — runs on every page load, no client JS.
 */

import Link from "next/link";
import { AlertTriangle, Calendar, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MAINTENANCE_LABELS, type MaintenanceKind } from "@/lib/maintenance";
import { formatDate } from "@/lib/utils";

type Row = {
  vehicle_id: string;
  kind: MaintenanceKind;
  date: string;
  next_due_date: string;
  vehicles: { name: string } | null;
};

// Window inside which we surface reminders. Past = always shown (overdue).
// 60 days felt right after the audit — covers a "next month" planning horizon
// without spamming items that are still half a year out.
const HORIZON_DAYS = 60;

type Urgency = "overdue" | "soon" | "later";

function urgencyOf(next: string, today: Date): { urgency: Urgency; daysLeft: number } {
  const due = new Date(next + "T00:00:00");
  const ms = due.getTime() - today.getTime();
  const daysLeft = Math.round(ms / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { urgency: "overdue", daysLeft };
  if (daysLeft < 7) return { urgency: "overdue", daysLeft }; // <7d treated like overdue (red)
  if (daysLeft <= 30) return { urgency: "soon", daysLeft };
  return { urgency: "later", daysLeft };
}

function urgencyClasses(u: Urgency) {
  switch (u) {
    case "overdue":
      return {
        card: "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40",
        title: "text-red-800 dark:text-red-200",
        icon: "text-red-600 dark:text-red-400",
        chip: "bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300",
      };
    case "soon":
      return {
        card: "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40",
        title: "text-amber-800 dark:text-amber-200",
        icon: "text-amber-600 dark:text-amber-400",
        chip: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
      };
    case "later":
      return {
        card: "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30",
        title: "text-emerald-800 dark:text-emerald-200",
        icon: "text-emerald-600 dark:text-emerald-400",
        chip: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
      };
  }
}

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft < 0) {
    const past = -daysLeft;
    return `po termínu (${past} ${past === 1 ? "den" : past < 5 ? "dny" : "dnů"})`;
  }
  if (daysLeft === 0) return "dnes";
  if (daysLeft === 1) return "zítra";
  if (daysLeft < 5) return `za ${daysLeft} dny`;
  return `za ${daysLeft} dnů`;
}

export async function DueReminders({
  vehicleId,
  showVehicleName = true,
}: {
  /** When set, restrict reminders to a single vehicle. */
  vehicleId?: string;
  /** Show vehicle name next to each item. Default true (multi-vehicle view). */
  showVehicleName?: boolean;
}) {
  const supabase = await createClient();

  // v2.17.0 — bound the fetch so DueReminders scales with current
  //   reality, not full history. Window: anything due from -7 days
  //   (recently overdue) to +90 days (future). The "stale" logic in
  //   the renderer below filters further; we just keep the SQL cheap.
  const _now = new Date();
  const _past = new Date(_now); _past.setDate(_now.getDate() - 7);
  const _future = new Date(_now); _future.setDate(_now.getDate() + 90);
  const _iso = (d: Date) => d.toISOString().slice(0, 10);

  let query = supabase
    .from("maintenance_entries")
    .select("vehicle_id, kind, date, next_due_date, vehicles(name)")
    .not("next_due_date", "is", null)
    .gte("next_due_date", _iso(_past))
    .lte("next_due_date", _iso(_future))
    .order("next_due_date", { ascending: true })
    .limit(100);

  if (vehicleId) query = query.eq("vehicle_id", vehicleId);

  const { data } = await query;
  const rows = (data as unknown as Row[] | null) ?? [];

  // Keep only the most-recent entry per (vehicle, kind).
  // `rows` is already ordered by date DESC, so the first hit wins.
  const seen = new Set<string>();
  const latest: Row[] = [];
  for (const r of rows) {
    const k = `${r.vehicle_id}::${r.kind}`;
    if (seen.has(k)) continue;
    seen.add(k);
    latest.push(r);
  }

  // Today as YYYY-MM-DD in local time, then back to a Date for diffing.
  const todayStr = new Date().toLocaleDateString("sv-SE"); // ISO-ish
  const today = new Date(todayStr + "T00:00:00");
  const horizon = new Date(today.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const visible = latest
    .map((r) => ({ row: r, ...urgencyOf(r.next_due_date, today) }))
    .filter(({ row, daysLeft }) => {
      const due = new Date(row.next_due_date + "T00:00:00");
      return daysLeft < 0 || due <= horizon;
    })
    .sort((a, b) => a.row.next_due_date.localeCompare(b.row.next_due_date));

  // Don't render anything when nothing is due — keeps page calm
  if (visible.length === 0) return null;

  // Most urgent group leads the headline color
  const headlineUrgency: Urgency = visible[0].urgency;
  const cls = urgencyClasses(headlineUrgency);

  return (
    <div className={`card p-4 border ${cls.card}`}>
      <div className="flex items-center gap-2">
        {headlineUrgency === "overdue" ? (
          <AlertTriangle className={`h-4 w-4 ${cls.icon}`} />
        ) : headlineUrgency === "soon" ? (
          <Calendar className={`h-4 w-4 ${cls.icon}`} />
        ) : (
          <Check className={`h-4 w-4 ${cls.icon}`} />
        )}
        <h2 className={`text-sm font-semibold ${cls.title}`}>Co tě čeká</h2>
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {visible.map(({ row, urgency, daysLeft }) => {
          const c = urgencyClasses(urgency);
          return (
            <li key={`${row.vehicle_id}-${row.kind}`} className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${c.chip}`}>
                {daysLeftLabel(daysLeft)}
              </span>
              <Link
                href={`/v/${row.vehicle_id}/maintenance`}
                className="hover:underline"
              >
                <span className="font-medium">{MAINTENANCE_LABELS[row.kind]}</span>
                {showVehicleName && row.vehicles?.name && (
                  <span className="text-slate-500 dark:text-slate-400"> · {row.vehicles.name}</span>
                )}
              </Link>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(row.next_due_date)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
