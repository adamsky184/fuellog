/**
 * Polished brand tiles for fuel-station pumps.
 *
 * These are distinctive, inline SVG "tiles" that use each brand's official
 * color palette and signature icon, rendered at arbitrary sizes (16px in
 * tables, 32px in cards, 48px in rankings). They stay fully offline (no
 * external HTTP calls) and avoid copying trademarked logos verbatim —
 * instead they are carefully tuned visual approximations that a Czech
 * driver instantly recognizes.
 *
 * Shell, Aral and Globus paths are derived from the open-source simple-icons
 * project (CC0). The remaining brands are hand-crafted wordmarks with a
 * motif chosen to echo the real logo (chevron, diamond, circle, etc.).
 *
 * Unknown brands fall back to the existing BrandBadge (colored circle with
 * initials).
 */

import { BrandBadge } from "@/components/stats-charts";

function normalize(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/* ----- Path data (from simple-icons, CC0) ----- */

const SHELL_PATH =
  "M12 .863C5.34.863 0 6.251 0 12.98c0 .996.038 1.374.246 2.33l3.662 2.71.57 4.515h6.102l.326.227c.377.262.705.375 1.082.375.352 0 .732-.101 1.024-.313l.39-.289h6.094l.563-4.515 3.695-2.71c.208-.956.246-1.334.246-2.33C24 6.252 18.661.863 12 .863zm.996 2.258c.9 0 1.778.224 2.512.649l-2.465 12.548 3.42-12.062c1.059.36 1.863.941 2.508 1.814l.025.034-4.902 10.615 5.572-9.713.033.03c.758.708 1.247 1.567 1.492 2.648l-6.195 7.666 6.436-6.5.01.021c.253.563.417 1.36.417 1.996 0 .509-.024.712-.164 1.25l-3.554 2.602-.467 3.71h-4.475l-.517.395c-.199.158-.482.266-.682.266-.199 0-.483-.108-.682-.266l-.517-.394H6.322l-.445-3.61-3.627-2.666c-.11-.436-.16-.83-.16-1.261 0-.72.159-1.49.426-2.053l.013-.024 6.45 6.551L2.75 9.621c.25-1.063.874-2.09 1.64-2.713l5.542 9.776L4.979 6.1c.555-.814 1.45-1.455 2.546-1.827l3.424 12.069L8.355 3.816l.055-.03c.814-.45 1.598-.657 2.457-.657.195 0 .286.004.528.03l.587 13.05.46-13.059c.224-.025.309-.029.554-.029z";

/* ----- Brand tile definitions ----- */

type TileKind = "svgpath" | "wordmark";

type TileDef = {
  kind: TileKind;
  bg: string;
  fg: string;
  /** For "svgpath": path data in 24×24 viewBox */
  path?: string;
  /** For "wordmark": the short text shown */
  label?: string;
  /** Optional secondary accent color */
  accent?: string;
  /** Optional motif drawn underneath */
  motif?: "pecten" | "stripe" | "arrow" | "dot" | "wave" | "chevron" | "square" | "diamond" | "sun" | "star";
  /** Optional accent bar color at bottom */
  barColor?: string;
};

// Each tile is keyed by a normalized slug. Multiple aliases map to the same tile.
const TILES: Record<string, TileDef> = {
  // Shell — yellow tile, red pecten shell drawn from simple-icons path
  shell: {
    kind: "svgpath",
    bg: "#FFD500",
    fg: "#DD1D21",
    path: SHELL_PATH,
  },

  // Aral — simple-icons aral has very complex path, we use our own diamond wordmark
  aral: {
    kind: "wordmark",
    bg: "#0063CB",
    fg: "#ffffff",
    label: "aral",
    motif: "diamond",
    accent: "#ffffff",
  },

  // Globus — orange tile with signature star
  globus: {
    kind: "wordmark",
    bg: "#CA6201",
    fg: "#ffffff",
    label: "Globus",
    motif: "star",
    accent: "#ffd000",
  },

  // MOL — dark-blue tile with green accent stripe + "mol" wordmark
  mol: {
    kind: "wordmark",
    bg: "#004B8D",
    fg: "#ffffff",
    label: "mol",
    motif: "stripe",
    accent: "#7FBF3F",
    barColor: "#7FBF3F",
  },

  // ORLEN — red tile with eagle-like chevron
  orlen: {
    kind: "wordmark",
    bg: "#E20D2F",
    fg: "#ffffff",
    label: "ORLEN",
    motif: "chevron",
    accent: "#ffe74c",
  },

  // Benzina — green tile (ORLEN sub-brand), white "B"
  benzina: {
    kind: "wordmark",
    bg: "#00824A",
    fg: "#ffffff",
    label: "B",
    motif: "arrow",
    accent: "#ffd600",
  },
  orlenbenzina: {
    kind: "wordmark",
    bg: "#00824A",
    fg: "#ffffff",
    label: "B",
    motif: "arrow",
    accent: "#ffd600",
  },

  // OMV — navy tile with orange stripe
  omv: {
    kind: "wordmark",
    bg: "#00336E",
    fg: "#ffffff",
    label: "OMV",
    motif: "stripe",
    accent: "#ef8f00",
    barColor: "#ef8f00",
  },

  // Euro Oil — blue with wave motif
  eurooil: {
    kind: "wordmark",
    bg: "#0072CE",
    fg: "#ffffff",
    label: "EO",
    motif: "wave",
    accent: "#a7d8ff",
  },
  euroil: {
    kind: "wordmark",
    bg: "#0072CE",
    fg: "#ffffff",
    label: "EO",
    motif: "wave",
    accent: "#a7d8ff",
  },

  // Total / TotalEnergies — red tile with tri-color sun motif
  total: {
    kind: "wordmark",
    bg: "#ED1C24",
    fg: "#ffffff",
    label: "T",
    motif: "sun",
    accent: "#FFC72C",
  },
  totalenergies: {
    kind: "wordmark",
    bg: "#ED1C24",
    fg: "#ffffff",
    label: "TE",
    motif: "sun",
    accent: "#FFC72C",
  },

  // Q8 (Kuwait Petroleum) — red/yellow with sail motif
  q8: {
    kind: "wordmark",
    bg: "#B4182D",
    fg: "#ffffff",
    label: "Q8",
    motif: "square",
    accent: "#F5B000",
  },

  // Robin Oil — red tile with bird-chevron motif
  robinoil: {
    kind: "wordmark",
    bg: "#B91C1C",
    fg: "#ffffff",
    label: "Robin",
    motif: "chevron",
    accent: "#fecaca",
  },

  // Slovnaft — Slovak, light-blue
  slovnaft: {
    kind: "wordmark",
    bg: "#0284C7",
    fg: "#ffffff",
    label: "SN",
    motif: "chevron",
    accent: "#f59e0b",
  },

  // ČEPRO / EuroOil parent — navy
  cepro: {
    kind: "wordmark",
    bg: "#1E3A8A",
    fg: "#ffffff",
    label: "Č",
    motif: "dot",
    accent: "#a7d8ff",
  },

  // Agip (ENI) — yellow with black 6-legged dog hint
  agip: {
    kind: "wordmark",
    bg: "#FFCD00",
    fg: "#111827",
    label: "Ag",
    motif: "dot",
    accent: "#111827",
  },

  // Lukoil — red with white
  lukoil: {
    kind: "wordmark",
    bg: "#E51737",
    fg: "#ffffff",
    label: "L",
    motif: "stripe",
    accent: "#ffffff",
    barColor: "#ffffff",
  },

  // Tesco (retail) — navy
  tesco: {
    kind: "wordmark",
    bg: "#1E3A8A",
    fg: "#ffffff",
    label: "Tesco",
    motif: "stripe",
    accent: "#ef4444",
    barColor: "#ef4444",
  },

  // Makro — teal
  makro: {
    kind: "wordmark",
    bg: "#0f766e",
    fg: "#ffffff",
    label: "M",
    motif: "chevron",
    accent: "#f59e0b",
  },

  // Pap Oil — violet
  pap: {
    kind: "wordmark",
    bg: "#7c3aed",
    fg: "#ffffff",
    label: "P",
    motif: "dot",
    accent: "#ddd6fe",
  },

  // ONO — orange
  ono: {
    kind: "wordmark",
    bg: "#f97316",
    fg: "#ffffff",
    label: "ono",
    motif: "stripe",
    accent: "#fed7aa",
    barColor: "#fed7aa",
  },
  onocz: {
    kind: "wordmark",
    bg: "#f97316",
    fg: "#ffffff",
    label: "ono",
    motif: "stripe",
    accent: "#fed7aa",
  },

  // Stopka — small Czech chain, use green
  stopka: {
    kind: "wordmark",
    bg: "#16A34A",
    fg: "#ffffff",
    label: "Stp",
    motif: "dot",
    accent: "#facc15",
  },
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
      return <rect x={0} y={s * 0.82} width={s} height={s * 0.12} fill={color} />;
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
          d={`M ${s * 0.15} ${s * 0.88} L ${s * 0.5} ${s * 0.65} L ${s * 0.85} ${s * 0.88}`}
          fill="none"
          stroke={color}
          strokeWidth={s * 0.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "square":
      return (
        <rect
          x={s * 0.72}
          y={s * 0.08}
          width={s * 0.2}
          height={s * 0.2}
          fill={color}
          rx={s * 0.02}
        />
      );
    case "diamond":
      return (
        <path
          d={`M ${s * 0.85} ${s * 0.2} L ${s * 0.92} ${s * 0.3} L ${s * 0.85} ${s * 0.4} L ${s * 0.78} ${s * 0.3} Z`}
          fill={color}
          opacity={0.9}
        />
      );
    case "sun":
      // Small half-circle at bottom center — evokes TotalEnergies sun/burst
      return (
        <>
          <circle cx={s * 0.5} cy={s * 0.88} r={s * 0.12} fill={color} />
          <path
            d={`M ${s * 0.3} ${s * 0.88} L ${s * 0.7} ${s * 0.88}`}
            stroke={color}
            strokeWidth={s * 0.03}
            strokeLinecap="round"
          />
        </>
      );
    case "star":
      return (
        <path
          d={`M ${s * 0.82} ${s * 0.18} L ${s * 0.86} ${s * 0.08} L ${s * 0.9} ${s * 0.18} L ${s} ${s * 0.2} L ${s * 0.92} ${s * 0.26} L ${s * 0.94} ${s * 0.36} L ${s * 0.86} ${s * 0.3} L ${s * 0.78} ${s * 0.36} L ${s * 0.8} ${s * 0.26} L ${s * 0.72} ${s * 0.2} Z`}
          fill={color}
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
  rounded?: boolean;
}) {
  const tile = findTile(brand);
  if (!tile) {
    return <BrandBadge brand={brand} size={size} />;
  }

  const radius = rounded ? size * 0.22 : size * 0.08;

  // For svgpath tiles: render the brand color as background, colored icon path centered.
  if (tile.kind === "svgpath" && tile.path) {
    // Icon path is drawn in its own 24x24 viewBox, scaled to fit ~70% of tile.
    const iconScale = (size * 0.7) / 24;
    const iconOffset = (size - size * 0.7) / 2;
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
        <g transform={`translate(${iconOffset}, ${iconOffset}) scale(${iconScale})`}>
          <path d={tile.path} fill={tile.fg} />
        </g>
      </svg>
    );
  }

  // Wordmark tile
  const label = tile.label ?? "?";
  const fontSize =
    size * (label.length >= 5 ? 0.26 : label.length >= 3 ? 0.34 : label.length === 2 ? 0.46 : 0.58);

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
      {tile.motif && tile.accent && <Motif motif={tile.motif} color={tile.accent} size={size} />}
      {tile.barColor && <rect x={0} y={size * 0.88} width={size} height={size * 0.12} fill={tile.barColor} />}
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
        {label}
      </text>
    </svg>
  );
}
