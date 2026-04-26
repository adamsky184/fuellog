/**
 * v2.12.0 — type for European country SVG paths. v2.17.0: data array
 *   (EUROPE_COUNTRY_PATHS, EUROPE_VIEWBOX) was removed — the original
 *   simplified-polygon variant is no longer rendered anywhere.
 *   `europe-real.ts` ships the actual geometry; this file only
 *   re-exports the shared type so both stay in sync.
 */

export type CountryPath = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};
