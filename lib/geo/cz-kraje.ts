/**
 * v2.12.0 — type for Czech kraje SVG paths. v2.17.0: data array
 *   (CZ_KRAJE_PATHS, CZ_VIEWBOX) was removed — the original
 *   simplified-polygon variant is no longer rendered anywhere.
 *   `cz-kraje-real.ts` ships the actual geometry; this file only
 *   re-exports the shared type so both stay in sync.
 */

export type KrajPath = {
  code: string;
  label: string;
  d: string;
  centroid: [number, number];
};
