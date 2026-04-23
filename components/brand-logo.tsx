/**
 * Brand logos for fuel-station pumps.
 *
 * Strategy:
 *   1. If we have a real logo file in /public/brands/<NAME>.(png|jpeg),
 *      render it as an <img> tile. These are the official logos uploaded
 *      by the user — they look authentic and are recognized instantly.
 *   2. If no file, fall through to BrandBadge (colored circle with initials).
 *
 * The normalize() function maps variations of the same brand name
 * ("SHELL", "Shell", "Shell Praha") to the same logo file.
 */

import Image from "next/image";
import { BrandBadge } from "@/components/stats-charts";

function normalize(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Map normalized brand slug → { file name, background helper }.
 * Background color is shown when the logo is transparent — white for
 * most, but dark navy for MOL/OMV since their marks are light-on-dark.
 */
type Logo = {
  file: string;
  /** Tile background — picks a neutral that makes the logo pop. */
  bg: string;
};

const LOGOS: Record<string, Logo> = {
  agip: { file: "AGIP.jpeg", bg: "#ffffff" },
  aral: { file: "ARAL.png", bg: "#ffffff" },
  benzina: { file: "BENZINA.png", bg: "#ffffff" },
  orlenbenzina: { file: "BENZINA.png", bg: "#ffffff" },
  eurooil: { file: "EUROOIL.png", bg: "#ffffff" },
  euroil: { file: "EUROOIL.png", bg: "#ffffff" },
  globus: { file: "GLOBUS.png", bg: "#ffffff" },
  hruby: { file: "HRUBY.png", bg: "#ffffff" },
  hrubý: { file: "HRUBY.png", bg: "#ffffff" },
  makro: { file: "MAKRO.png", bg: "#ffffff" },
  mol: { file: "MOL.jpeg", bg: "#ffffff" },
  omv: { file: "OMV.png", bg: "#ffffff" },
  orlen: { file: "ORLEN.png", bg: "#ffffff" },
  // "ČS PRIM" from Adam's data → prim logo
  prim: { file: "PRIM.png", bg: "#ffffff" },
  čsprim: { file: "PRIM.png", bg: "#ffffff" },
  csprim: { file: "PRIM.png", bg: "#ffffff" },
  robinoil: { file: "ROBINOIL.jpeg", bg: "#ffffff" },
  shell: { file: "SHELL.png", bg: "#ffffff" },
  stopka: { file: "STOPKA.jpeg", bg: "#ffffff" },
  total: { file: "TOTAL.png", bg: "#ffffff" },
  totalenergies: { file: "TOTAL.png", bg: "#ffffff" },
};

function findLogo(brand: string): Logo | null {
  const key = normalize(brand);
  if (LOGOS[key]) return LOGOS[key];
  // "Shell Praha" → first word "shell" → shell
  const first = brand.trim().split(/\s+/)[0];
  if (first) {
    const firstKey = normalize(first);
    if (LOGOS[firstKey]) return LOGOS[firstKey];
  }
  return null;
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
  const logo = findLogo(brand);
  if (!logo) {
    return <BrandBadge brand={brand} size={size} />;
  }

  const radius = rounded ? Math.round(size * 0.22) : Math.round(size * 0.08);

  return (
    <span
      className="shrink-0 inline-block overflow-hidden ring-1 ring-slate-200/60 dark:ring-slate-700/60 relative"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: logo.bg,
      }}
      title={brand}
    >
      <Image
        src={`/brands/${logo.file}`}
        alt={brand}
        width={size}
        height={size}
        className="object-contain p-0.5"
        style={{ width: size, height: size }}
        unoptimized
      />
    </span>
  );
}
