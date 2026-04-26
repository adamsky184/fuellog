"use client";

/**
 * v2.11.0 — simple tile-based "choropleth" map.
 *
 * Why tiles, not real geography? Shipping accurate SVG paths for all
 * Czech kraje + every European country would balloon the bundle. A tile
 * grid (each cell = one region, sized + coloured by value) communicates
 * the same insight — where you tank — with zero geometry library and
 * fast render. Geographic positions are picked so the layout *roughly*
 * resembles a map (north top, west left). Good enough until v2.12.0.
 *
 * Colour scale: white → accent at the max value. Empty tiles greyed out.
 */

import { CZ_KRAJE, FOREIGN_COUNTRIES, PRAGUE_DISTRICTS } from "@/lib/regions";

export type TileDatum = {
  /** Stable id, e.g. "STC", "P8", "DE". */
  code: string;
  /** Visible label inside the tile. */
  label: string;
  /** Numeric value (litres / Kč / count). null = no data. */
  value: number | null;
  /** Optional secondary text shown under the label. */
  detail?: string;
};

export type TileLayoutCell = {
  code: string;
  label: string;
  /** 1-based grid coordinates. */
  col: number;
  row: number;
  /** Optional cell width / height span (defaults 1). */
  cw?: number;
  ch?: number;
};

/**
 * Hand-curated layouts. Each cell maps a region code to grid coords
 * picked to roughly resemble the geographic position.
 */

// ─── ČR kraje — 5 sloupců × 4 řádky, Praha jako jeden tile ─────────────────
// Pseudo-mapa CZ. P = Praha, dál standardní 3-pismenné kódy kraje.
//
//   ULK  LBK  HKK  PAK  -
//   KVK  STC  P    -    -
//   PLK  -    VYS  OLK  MSK
//   JCK  -    JMK  ZLK  -
export const CZ_KRAJE_LAYOUT: TileLayoutCell[] = [
  { code: "ULK", label: "Ústecký",        col: 1, row: 1 },
  { code: "LBK", label: "Liberecký",      col: 2, row: 1 },
  { code: "HKK", label: "Královéhradecký",col: 3, row: 1 },
  { code: "PAK", label: "Pardubický",     col: 4, row: 1 },

  { code: "KVK", label: "Karlovarský",    col: 1, row: 2 },
  { code: "STC", label: "Středočeský",    col: 2, row: 2 },
  { code: "P",   label: "Praha",          col: 3, row: 2 },

  { code: "PLK", label: "Plzeňský",       col: 1, row: 3 },
  { code: "VYS", label: "Vysočina",       col: 3, row: 3 },
  { code: "OLK", label: "Olomoucký",      col: 4, row: 3 },
  { code: "MSK", label: "Moravskoslezský",col: 5, row: 3 },

  { code: "JCK", label: "Jihočeský",      col: 1, row: 4 },
  { code: "JMK", label: "Jihomoravský",   col: 3, row: 4 },
  { code: "ZLK", label: "Zlínský",        col: 4, row: 4 },
];

// ─── Praha — 10 districts in two rows ─────────────────────────────────────
// Layout: P1 P2 P3 P4 P5 / P6 P7 P8 P9 P10
export const PRAGUE_LAYOUT: TileLayoutCell[] = PRAGUE_DISTRICTS.map((p, i) => ({
  code: p.code,
  label: p.label,
  col: (i % 5) + 1,
  row: Math.floor(i / 5) + 1,
}));

// ─── Evropa — vybrané státy v approximativním rozložení ────────────────────
// 7 sloupců × 5 řádků; SK/HU vlevo od ostatních, severozápad nahoře.
export const EUROPE_LAYOUT: TileLayoutCell[] = [
  { code: "GB", label: "GB", col: 1, row: 1 },
  { code: "NL", label: "NL", col: 3, row: 1 },
  { code: "DE", label: "DE", col: 4, row: 1 },
  { code: "PL", label: "PL", col: 6, row: 1 },

  { code: "BE", label: "BE", col: 2, row: 2 },
  { code: "CZ", label: "CZ", col: 4, row: 2 },
  { code: "SK", label: "SK", col: 5, row: 2 },

  { code: "FR", label: "FR", col: 2, row: 3 },
  { code: "CH", label: "CH", col: 3, row: 3 },
  { code: "AT", label: "AT", col: 4, row: 3 },
  { code: "HU", label: "HU", col: 5, row: 3 },

  { code: "PT", label: "PT", col: 1, row: 4 },
  { code: "ES", label: "ES", col: 2, row: 4 },
  { code: "IT", label: "IT", col: 3, row: 4 },
  { code: "SI", label: "SI", col: 4, row: 4 },
  { code: "HR", label: "HR", col: 5, row: 4 },
];

// ─── Pure label helpers (no JSX) ───────────────────────────────────────────
export function findKrajLabel(code: string): string {
  if (code === "P") return "Praha";
  return CZ_KRAJE.find((k) => k.code === code)?.label ?? code;
}
export function findCountryLabel(code: string): string {
  return FOREIGN_COUNTRIES.find((c) => c.country === code)?.label ?? code;
}

// ─── The tile grid component ───────────────────────────────────────────────
type Props = {
  title: string;
  /** ISO/kraj keyed values. */
  data: Map<string, number>;
  layout: TileLayoutCell[];
  /** Optional tile-label override (e.g. full name vs abbreviation). */
  showFullLabel?: boolean;
  /** Unit suffix shown in tooltips. */
  unit?: string;
  /** Number formatter (defaults to Czech locale). */
  format?: (n: number) => string;
};

export function ChoroplethTiles({
  title,
  data,
  layout,
  showFullLabel = false,
  unit = "l",
  format,
}: Props) {
  const fmt = format ?? ((n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 }));
  const values = Array.from(data.values()).filter((v) => v > 0);
  const max = values.length > 0 ? Math.max(...values) : 1;
  const total = values.reduce((a, b) => a + b, 0);

  const maxCol = Math.max(...layout.map((c) => c.col + (c.cw ?? 1) - 1));
  const maxRow = Math.max(...layout.map((c) => c.row + (c.ch ?? 1) - 1));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <span className="text-xs text-slate-400 tabular-nums">
          {fmt(total)} {unit} celkem
        </span>
      </div>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${maxRow}, minmax(44px, auto))`,
        }}
      >
        {layout.map((cell) => {
          const v = data.get(cell.code) ?? 0;
          const intensity = max > 0 ? v / max : 0;
          // CSS var --accent-soft is opaque-ish; we do our own alpha here.
          const bg = v > 0
            ? `color-mix(in oklab, var(--accent) ${Math.max(15, Math.round(intensity * 90))}%, white)`
            : undefined;
          const fg = intensity > 0.5 ? "#fff" : "inherit";
          return (
            <div
              key={cell.code}
              title={`${cell.label}${v > 0 ? ` — ${fmt(v)} ${unit}` : ""}`}
              className={`rounded-md border text-center px-1 py-1 leading-tight transition ${
                v > 0
                  ? "border-transparent"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400"
              }`}
              style={{
                gridColumn: `${cell.col} / span ${cell.cw ?? 1}`,
                gridRow: `${cell.row} / span ${cell.ch ?? 1}`,
                backgroundColor: bg,
                color: fg,
              }}
            >
              <div className="text-[11px] font-semibold">
                {showFullLabel ? cell.label : cell.code}
              </div>
              {v > 0 && (
                <div className="text-[10px] tabular-nums opacity-90">
                  {fmt(v)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
