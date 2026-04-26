/**
 * v2.13.0 — premium hero card on the /vehicles homepage.
 *
 * Server component. Loads the user's last-30d totals across ALL vehicles
 * they can see (RLS handles filtering) and renders a single dark "hero"
 * card with the month spend, plus three small stat lines and a delta
 * badge vs the previous 30 days.
 *
 * Inspired by Adam's Testora screenshot — single tonal accent + dark
 * focal element + everything else neutral.
 */

import { Wallet, TrendingDown, TrendingUp, Minus } from "lucide-react";
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
  // Paginated fetch — same pattern as fetch-all-stats.ts.
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

  // Hide hero entirely when the user has no fill-ups at all.
  if (now.count === 0 && prev.count === 0) return null;

  // Delta vs previous period.
  let deltaPct: number | null = null;
  if (prev.priceCzk > 0) {
    deltaPct = ((now.priceCzk - prev.priceCzk) / prev.priceCzk) * 100;
  }
  const deltaIcon = deltaPct == null
    ? <Minus className="h-3 w-3" />
    : deltaPct > 0
      ? <TrendingUp className="h-3 w-3" />
      : <TrendingDown className="h-3 w-3" />;
  const deltaTone = deltaPct == null
    ? "bg-white/10 text-white/70"
    : deltaPct > 0
      ? "bg-white/15 text-white"
      : "bg-emerald-300/20 text-emerald-100";
  const deltaText = deltaPct == null
    ? "—"
    : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;

  return (
    <section className="rounded-2xl bg-slate-900 dark:bg-slate-950 text-white p-5 sm:p-6 ring-1 ring-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/55 inline-flex items-center gap-1.5">
            <Wallet className="h-3 w-3" />
            Posledních 30 dní
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-medium tracking-tight tabular-nums">
              {formatNumber(now.priceCzk, 0)}
            </span>
            <span className="text-base text-white/60">Kč</span>
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${deltaTone}`}>
          {deltaIcon}
          <span className="tabular-nums">{deltaText}</span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-white/50">Tankování</div>
          <div className="mt-0.5 tabular-nums">
            <span className="font-medium">{now.count}</span>
            <span className="text-white/55">×</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-white/50">Litry</div>
          <div className="mt-0.5 tabular-nums">
            <span className="font-medium">{formatNumber(now.liters, 1)}</span>
            <span className="text-white/55 ml-1">l</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-white/50">Ujeto</div>
          <div className="mt-0.5 tabular-nums">
            <span className="font-medium">{formatNumber(now.km, 0)}</span>
            <span className="text-white/55 ml-1">km</span>
          </div>
        </div>
      </div>
    </section>
  );
}
