// v2.13.1 — generate lib/geo/cz-kraje-real.ts from Natural Earth admin-1
// data (the canonical open-data source for country subdivisions).
//
// Source: https://github.com/nvkelso/natural-earth-vector
// File:   geojson/ne_10m_admin_1_states_provinces.geojson (≈ 39 MB)
//
// Usage:
//   1. Clone Natural Earth (sparse fetch of the geojson dir)
//        git clone --depth 1 --filter=blob:none --sparse \
//          https://github.com/nvkelso/natural-earth-vector.git /tmp/ne
//        cd /tmp/ne && git sparse-checkout set geojson
//   2. From the FuelLog repo: NE_PATH=/tmp/ne node scripts/build-cz-geo.mjs
//   3. Commit the resulting lib/geo/cz-kraje-real.ts.
//
// The script writes ONLY the small projected output, not the 39 MB source.

import { geoMercator, geoPath } from "d3-geo";
import { readFileSync, writeFileSync } from "node:fs";

const NE_PATH = process.env.NE_PATH || "/tmp/ne";
const SRC = `${NE_PATH}/geojson/ne_10m_admin_1_states_provinces.geojson`;

// Map ISO 3166-2 codes (Natural Earth) → internal short codes used
// throughout the FuelLog stats (region column in `fill_ups`).
const ISO_TO_CODE = {
  "CZ-PR": "P",   "CZ-ST": "STC", "CZ-JC": "JCK", "CZ-PL": "PLK",
  "CZ-KA": "KVK", "CZ-US": "ULK", "CZ-LI": "LBK", "CZ-KR": "HKK",
  "CZ-PA": "PAK", "CZ-VY": "VYS", "CZ-JM": "JMK", "CZ-OL": "OLK",
  "CZ-ZL": "ZLK", "CZ-MO": "MSK",
};
const CODE_TO_LABEL = {
  P: "Praha", STC: "Středočeský", JCK: "Jihočeský", PLK: "Plzeňský",
  KVK: "Karlovarský", ULK: "Ústecký", LBK: "Liberecký", HKK: "Královéhradecký",
  PAK: "Pardubický", VYS: "Vysočina", JMK: "Jihomoravský", OLK: "Olomoucký",
  ZLK: "Zlínský", MSK: "Moravskoslezský",
};

const data = JSON.parse(readFileSync(SRC, "utf8"));
const cz = data.features.filter((f) => f.properties.adm0_a3 === "CZE");

if (cz.length === 0) {
  throw new Error(`No Czech regions found in ${SRC}`);
}

// Mercator centred on Czechia (lon ≈ 15.5, lat ≈ 49.8). 1000 × 600 viewBox.
const projection = geoMercator()
  .center([15.5, 49.8])
  .scale(8500)
  .translate([500, 300]);
const path = geoPath(projection);

// Round each numeric coordinate in the SVG path string to 1 decimal place.
// Cuts ~65 % of bundle size at no perceivable visual loss for a stats map.
function roundPath(d) {
  return d.replace(/-?\d+\.\d+/g, (n) => Number(n).toFixed(1));
}

const shapes = cz
  .map((f) => {
    const iso = f.properties.iso_3166_2;
    const code = ISO_TO_CODE[iso];
    if (!code) {
      console.warn(`Unmapped ISO code: ${iso} (${f.properties.name})`);
      return null;
    }
    const d = roundPath(path(f));
    const [cx, cy] = path.centroid(f);
    return {
      code,
      label: CODE_TO_LABEL[code],
      d,
      centroid: [Number(cx.toFixed(1)), Number(cy.toFixed(1))],
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.code.localeCompare(b.code));

const ts = `/**
 * v2.13.1 — REAL Czech kraje outlines.
 *
 * Generated from Natural Earth admin-1 (1:10M scale) projected with
 * Mercator centred on (lon=15.5, lat=49.8), scale=8500, fit to a
 * 1000 × 600 viewBox. ISO 3166-2 codes mapped to FuelLog's internal
 * 3-letter codes (STC, JCK, PLK, …) plus "P" for Praha.
 *
 * To regenerate: see scripts/build-cz-geo.mjs. Do not edit by hand.
 *
 * Total path data: ${shapes.reduce((s, x) => s + x.d.length, 0)} chars.
 */

import type { KrajPath } from "./cz-kraje";

export const CZ_VIEWBOX_REAL = "0 0 1000 600";

export const CZ_KRAJE_PATHS_REAL: KrajPath[] = ${JSON.stringify(shapes, null, 2)};
`;

writeFileSync("lib/geo/cz-kraje-real.ts", ts);
console.log(
  `Wrote lib/geo/cz-kraje-real.ts — ${shapes.length} kraje, ${shapes.reduce(
    (s, x) => s + x.d.length,
    0,
  )} chars of path data.`,
);
