// v2.13.0 — generate lib/geo/europe-real.ts from world-atlas + d3-geo.
//
// Run with `node scripts/build-europe-geo.mjs`. Re-run only when the
// world-atlas dependency is upgraded.

import { feature } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-110m.json");

const NAME_TO_ISO = {
  "Czechia": "CZ", "Slovakia": "SK", "Germany": "DE", "Austria": "AT",
  "Italy": "IT", "Poland": "PL", "Croatia": "HR", "Slovenia": "SI",
  "France": "FR", "Belgium": "BE", "Netherlands": "NL", "Spain": "ES",
  "Portugal": "PT", "Switzerland": "CH", "United Kingdom": "GB",
  "Ireland": "IE", "Hungary": "HU", "Denmark": "DK", "Norway": "NO",
  "Sweden": "SE", "Finland": "FI",
};

const fc = feature(topo, topo.objects.countries);
const europe = fc.features.filter((f) => NAME_TO_ISO[f.properties.name]);

// Mercator centered on Europe, fitted to a 1000×700 viewBox.
const projection = geoMercator()
  .center([15, 53])
  .scale(900)
  .translate([500, 350]);
const path = geoPath(projection);

const shapes = europe
  .map((f) => {
    const code = NAME_TO_ISO[f.properties.name];
    const d = path(f);
    const [cx, cy] = path.centroid(f);
    return {
      code,
      label: f.properties.name,
      d,
      centroid: [Number(cx.toFixed(1)), Number(cy.toFixed(1))],
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const ts = `/**
 * v2.13.0 — REAL European country outlines.
 *
 * Generated from \`world-atlas\` (Natural Earth, 1:110M scale) projected
 * with Mercator centered on Europe (lon=15, lat=53), scale=900, fit to
 * a 1000 × 700 viewBox.
 *
 * To regenerate: \`node scripts/build-europe-geo.mjs\`. Do not edit by
 * hand — your edits will be overwritten next time the script runs.
 *
 * Total path data: ${shapes.reduce((s, x) => s + x.d.length, 0)} chars.
 */

import type { CountryPath } from "./europe";

export const EUROPE_VIEWBOX_REAL = "0 0 1000 700";

export const EUROPE_COUNTRY_PATHS_REAL: CountryPath[] = ${JSON.stringify(shapes, null, 2)};
`;

writeFileSync("lib/geo/europe-real.ts", ts);
console.log(`Wrote lib/geo/europe-real.ts — ${shapes.length} countries, ${shapes.reduce((s, x) => s + x.d.length, 0)} chars of path data.`);
