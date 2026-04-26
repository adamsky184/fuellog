/**
 * v2.14.0 — compact, accent-aware hero.
 *
 * Replaces the v2.13.0 dark slab. Now ~40 % shorter, single horizontal
 * row, with a thin gradient accent bar on the left so the colour
 * picks up whatever the user has set in /profile or via the header
 * AccentToggle. Premium, not loud.
 */

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";

type Range = { from: string; to: string };

function isoDaysAgo(d: number): string {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString().slice(0, 10);
}

async function aggregate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  range: Range,
): Promise<{ priceCzk: number; liters: number; km: number; count: number }> {
  const PAGE = 1000;
  let priceCzk = 0;
  let liters = 0;
  let km = 0;
  let count = 0;
  for (let from = 0; from < 200000; from += PAGE) {
    const { data: page } = await supabase
      .from("fill_up_stats_v")
      .select("liters, total_price, total_price_czk, km_since_last, is_baseline")
      .gte("date", range.from)
      .lte("date", range.to)
      .range(from, from + PAGE - 1);
    if (!page || page.length === 0) break;
    for (const r of page as {
      liters: number | null;
      total_price: number | null;
      total_price_czk: number | null;
      km_since_last: number | null;
      is_baseline: boolean | null;
    }[]) {
      if (r.is_baseline) continue;
      liters += Number(r.liters ?? 0);
      priceCzk += Number(r.total_price_czk ?? r.total_price ?? 0);
      km += Number(r.km_since_last ?? 0);
      count += 1;
    }
    if (page.length < PAGE) break;
  }
  return { priceCzk, liters, km, count };
}

export async function DashboardHero() {
  const supabase = await createClient();

  const last30 = { from: isoDaysAgo(30), to: isoDaysAgo(0) };
  const prev30 = { from: isoDaysAgo(60), to: isoDaysAgo(31) };

  const [now, prev] = await Promise.all([
    aggregate(supabase, last30),
    aggregate(supabase, prev30),
  ]);

  if (now.count === 0 && prev.count === 0) return null;

  let deltaPct: number | null = null;
  if (prev.priceCzk > 0) {
    deltaPct = ((now.priceCzk - prev.priceCzk) / prev.priceCzk) * 100;
  }

  const deltaIcon =
    deltaPct == null ? <Minus className="h-3 w-3" /> :
    deltaPct > 0 ? <TrendingUp className="h-3 w-3" /> :
    <TrendingDown className="h-3 w-3" />;

  const deltaTone =
    deltaPct == null ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" :
    deltaPct > 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" :
    "bg-accent/15 text-accent";

  const deltaText =
    deltaPct == null ? "—" :
    `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;

  return (
    <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex">
      <div
        aria-hidden
        className="w-1 shrink-0"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--accent-rgb)) 0%, rgb(var(--accent-hover-rgb)) 100%)",
        }}
      />
      <div className="flex-1 px-4 py-3 sm:px-5 sm:py-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
            Posledních 30 dní
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-[26px] font-medium tracking-tight tabular-nums">
              {formatNumber(now.priceCzk, 0)}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Kč</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${deltaTone}`}
            >
              {deltaIcon}
              <span className="tabular-nums">{deltaText}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-5 sm:gap-6 text-[12px]">
          <Mini label="Tankování" value={`${now.count}×`} />
          <Mini label="Litry" value={`${formatNumber(now.liters, 1)} l`} />
          <Mini label="Ujeto" value={`${formatNumber(now.km, 0)} km`} />
        </div>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 font-medium tabular-nums text-slate-700 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}
