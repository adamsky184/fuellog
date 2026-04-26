"use client";

/**
 * v2.12.0 — three real (simplified-SVG) maps:
 *   - Evropa  — countries
 *   - ČR kraje — 14 regions + Praha aggregate
 *   - Praha   — districts P1–P10
 *
 * Aggregation key = total liters per region. Switch tabs to flip
 * between the three maps; only tabs with data are rendered.
 */

import { useMemo, useState } from "react";
import { GeoMap } from "@/components/geo-map";
import { CZ_KRAJE_PATHS_REAL, CZ_VIEWBOX_REAL } from "@/lib/geo/cz-kraje-real";
import { PRAHA_DISTRICT_PATHS, PRAHA_VIEWBOX } from "@/lib/geo/cz-praha";
import { EUROPE_COUNTRY_PATHS_REAL, EUROPE_VIEWBOX_REAL } from "@/lib/geo/europe-real";
import { countryFlag } from "@/lib/country-flags";
import type { RawStatsRow } from "@/components/stats-dashboard";

type MapKey = "kraje" | "praha" | "europe";

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
          praha.set(region, (praha.get(region) ?? 0) + liters);
          kraje.set("P", (kraje.get("P") ?? 0) + liters);
        } else if (region) {
          kraje.set(region, (kraje.get(region) ?? 0) + liters);
        }
      }
    }
    return { europe, kraje, praha };
  }, [rows]);

  const tabs: { key: MapKey; label: string; count: number }[] = [
    { key: "kraje",  label: "ČR kraje",         count: [...kraje.values()].filter((v) => v > 0).length },
    { key: "praha",  label: "Praha",            count: [...praha.values()].filter((v) => v > 0).length },
    { key: "europe", label: "Evropa",           count: [...europe.values()].filter((v) => v > 0).length },
  ];
  const available = tabs.filter((t) => t.count > 0);
  const [active, setActive] = useState<MapKey>(available[0]?.key ?? "kraje");

  if (available.length === 0) return null;
  const safeActive = available.find((t) => t.key === active) ? active : available[0].key;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-semibold text-sm">Mapy tankování</div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
          {available.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`px-3 py-1 rounded-md transition ${
                safeActive === t.key
                  ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100 font-medium"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {safeActive === "kraje" && (
        <GeoMap
          title="Litry tankované po krajích ČR"
          viewBox={CZ_VIEWBOX_REAL}
          shapes={CZ_KRAJE_PATHS_REAL}
          data={kraje}
          showLabels={false}
        />
      )}
      {safeActive === "praha" && (
        <GeoMap
          title="Litry tankované v městských částech Prahy"
          viewBox={PRAHA_VIEWBOX}
          shapes={PRAHA_DISTRICT_PATHS}
          data={praha}
        />
      )}
      {safeActive === "europe" && (
        <GeoMap
          title="Litry tankované v Evropě"
          viewBox={EUROPE_VIEWBOX_REAL}
          shapes={EUROPE_COUNTRY_PATHS_REAL}
          data={europe}
          flagFor={(code) => countryFlag(code)}
          showLabels={false}
        />
      )}
    </div>
  );
}
