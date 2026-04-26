"use client";

/**
 * v2.11.0 — three tile-based "maps" rendered from filtered fill-up rows:
 *
 *   - Evropa  — countries (CZ aggregate + foreign list)
 *   - ČR kraje — 13 kraje + Praha (P*)
 *   - Praha   — districts P1–P10
 *
 * Aggregation key: total liters per region. Empty layouts hide automatically
 * if the user has no rows at all in that bucket.
 */

import { useMemo } from "react";
import {
  ChoroplethTiles,
  CZ_KRAJE_LAYOUT,
  EUROPE_LAYOUT,
  PRAGUE_LAYOUT,
} from "@/components/choropleth-tiles";
import type { RawStatsRow } from "@/components/stats-dashboard";

export function StatsMaps({ rows }: { rows: RawStatsRow[] }) {
  const { europe, kraje, praha } = useMemo(() => {
    const europe = new Map<string, number>();
    const kraje = new Map<string, number>();
    const praha = new Map<string, number>();

    for (const r of rows) {
      const liters = Number(r.liters ?? 0);
      if (!liters) continue;
      const country = (r.country ?? "CZ").toUpperCase();
      europe.set(country, (europe.get(country) ?? 0) + liters);

      if (country === "CZ") {
        const region = (r.region ?? "").toUpperCase();
        if (region.startsWith("P") && region !== "PLK" && region !== "PAK") {
          // Prague district
          praha.set(region, (praha.get(region) ?? 0) + liters);
          kraje.set("P", (kraje.get("P") ?? 0) + liters);
        } else if (region) {
          kraje.set(region, (kraje.get(region) ?? 0) + liters);
        }
      }
    }
    return { europe, kraje, praha };
  }, [rows]);

  const showEurope = europe.size > 0;
  const showKraje = kraje.size > 0;
  const showPraha = praha.size > 0;

  if (!showEurope && !showKraje && !showPraha) return null;

  return (
    <div className="card p-4 space-y-5">
      <div className="font-semibold text-sm">Mapy tankování</div>
      <div className="grid md:grid-cols-2 gap-5">
        {showKraje && (
          <ChoroplethTiles
            title="ČR kraje"
            data={kraje}
            layout={CZ_KRAJE_LAYOUT}
          />
        )}
        {showPraha && (
          <ChoroplethTiles
            title="Praha — městské části"
            data={praha}
            layout={PRAGUE_LAYOUT}
          />
        )}
        {showEurope && (
          <ChoroplethTiles
            title="Evropa"
            data={europe}
            layout={EUROPE_LAYOUT}
          />
        )}
      </div>
    </div>
  );
}
