/**
 * Stylized brand tiles for fuel-station pumps.
 *
 * These are NOT copies of the official logos — they are simple, distinctive
 * inline SVG "tiles" that use each brand's signature color and a short
 * monogram plus a small shape motif. This keeps the app fully offline,
 * avoids external HTTP calls, and sidesteps trademark concerns while still
 * giving each brand an instantly recognizable look.
 *
 * Unknown brands fall back to the existing BrandBadge (colored circle with
 * initials), so new pumps keep working without code changes.
 */

import { BrandBadge } from "@/components/stats-charts";

function normalize(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

type TileDef = {
  bg: string;
  fg: string;
  label: string;
  /** Optional accent shape layered behind the label */
  motif?: "pecten" | "stripe" | "arrow" | "dot" | "wave" | "chevron";
  /** Optional secondary accent color for two-tone motifs */
  accent?: string;
};

// Each tile is keyed by a normalized slug. Multiple aliases map to the same tile.
const TILES: Record<string, TileDef> = {
  shell: { bg: "#fde047", fg: "#b91c1c", label: "S", motif: "pecten", accent: "#ef4444" },
  omv: { bg: "#1d4ed8", fg: "#ffffff", label: "OMV", motif: "stripe", accent: "#f97316" },
  benzina: { bg: "#15803d", fg: "#fde047", label: "B", motif: "arrow", accent: "#bbf7d0" },
  orlenbenzina: { bg: "#15803d", fg: "#fde047", label: "B", motif: "arrow", accent: "#bbf7d0" },
  mol: { bg: "#1e40af", fg: "#ffffff", label: "mol", motif: "dot", accent: "#22c55e" },
  eurooil: { bg: "#0ea5e9", fg: "#ffffff", label: "EO", motif: "wave", accent: "#bae6fd" },
  euroil: { bg: "#0ea5e9", fg: "#ffffff", label: "EO", motif: "wave", accent: "#bae6fd" },
  slovnaft: { bg: "#0284c7", fg: "#ffffff", label: "SN", motif: "chevron", accent: "#f59e0b" },
  ono: { bg: "#f97316", fg: "#ffffff", label: "ono", motif: "stripe", accent: "#fed7aa" },
  orlen: { bg: "#dc2626", fg: "#ffffff", label: "O", motif: "chevron", accent: "#fecaca" },
  agip: { bg: "#facc15", fg: "#111827", label: "Ag", motif: "dot", accent: "#111827" },
  lukoil: { bg: "#b91c1c", fg: "#ffffff", label: "L", motif: "stripe", accent: "#fde047" },
  total: { bg: "#ef4444", fg: "#ffffff", label: "T", motif: "wave", accent: "#2563eb" },
  totalenergies: { bg: "#ef4444", fg: "#ffffff", label: "TE", motif: "wave", accent: "#2563eb" },
  globus: { bg: "#059669", fg: "#ffffff", label: "G", motif: "dot", accent: "#fde047" },
  tesco: { bg: "#1e3a8a", fg: "#ffffff", label: "T", motif: "stripe", accent: "#ef4444" },
  makro: { bg: "#0f766e", fg: "#ffffff", label: "M", motif: "chevron", accent: "#f59e0b" },
  pap: { bg: "#7c3aed", fg: "#ffffff", label: "P", motif: "dot", accent: "#ddd6fe" },
  onocz: { bg: "#f97316", fg: "#ffffff", label: "ono", motif: "stripe", accent: "#fed7aa" },
};

function findTile(brand: string): TileDef | null {
  const key = normalize(brand);
  if (TILES[key]) return TILES[key];
  // Try dropping common suffix words — "Shell Praha" → "shell"
  const first = brand.trim().split(/\s+/)[0];
  if (first) {
    const firstKey = normalize(first);
    if (TILES[firstKey]) return TILES[firstKey];
  }
  return null;
}

/* ----------------------------- Motif renderers ----------------------------- */

function Motif({ motif, color, size }: { motif: TileDef["motif"]; color: string; size: number }) {
  const s = size;
  switch (motif) {
    case "pecten":
      // Simple scalloped-fan shape (stylized, not copied)
      return (
        <path
          d={`M ${s * 0.15} ${s * 0.75} Q ${s * 0.35} ${s * 0.2} ${s * 0.5} ${s * 0.75} Q ${s * 0.65} ${s * 0.2} ${s * 0.85} ${s * 0.75}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.08}
          strokeLinecap="round"
        />
      );
    case "stripe":
      return (
        <rect
          x={0}
          y={s * 0.78}
          width={s}
          height={s * 0.1}
          fill={color}
        />
      );
    case "arrow":
      return (
        <path
          d={`M ${s * 0.18} ${s * 0.82} L ${s * 0.5} ${s * 0.68} L ${s * 0.82} ${s * 0.82}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.09}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "dot":
      return <circle cx={s * 0.82} cy={s * 0.18} r={s * 0.1} fill={color} />;
    case "wave":
      return (
        <path
          d={`M 0 ${s * 0.82} Q ${s * 0.25} ${s * 0.7} ${s * 0.5} ${s * 0.82} Q ${s * 0.75} ${s * 0.94} ${s} ${s * 0.82}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.08}
          strokeLinecap="round"
        />
      );
    case "chevron":
      return (
        <path
          d={`M ${s * 0.15} ${s * 0.88} L ${s * 0.5} ${s * 0.68} L ${s * 0.85} ${s * 0.88}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

/* ------------------------------ BrandLogo main ---------------------------- */

export function BrandLogo({
  brand,
  size = 22,
  rounded = true,
}: {
  brand: string;
  size?: number;
  /** Set false for square (table cells), true for rounded-pill look. Default true. */
  rounded?: boolean;
}) {
  const tile = findTile(brand);
  if (!tile) {
    // Fall back to the colored-initials badge from stats-charts.
    return <BrandBadge brand={brand} size={size} />;
  }

  const radius = rounded ? size * 0.22 : 4;
  // Font sizing scales down for longer labels so they fit in the tile.
  const fontSize = size * (tile.label.length >= 3 ? 0.32 : tile.label.length === 2 ? 0.44 : 0.58);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
      role="img"
    >
      <title>{brand}</title>
      <rect x={0} y={0} width={size} height={size} rx={radius} ry={radius} fill={tile.bg} />
      {tile.motif && tile.accent && (
        <Motif motif={tile.motif} color={tile.accent} size={size} />
      )}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={tile.fg}
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        style={{ letterSpacing: "-0.02em" }}
      >
        {tile.label}
      </text>
    </svg>
  );
}
