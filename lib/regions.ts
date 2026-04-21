/**
 * Full-name region list for the add-fill-up form and display.
 *
 * `code` is what we store in the `region` column.
 * `label` is the full Czech name shown in dropdowns and breakdowns.
 * `country` is the implied country for that region.
 *
 * Historical Czech lands (7) + Prague 1–10 districts + common foreign countries.
 */
export type RegionOption = {
  code: string;
  label: string;
  country: string;
};

export const PRAGUE_DISTRICTS: RegionOption[] = [
  { code: "P1", label: "Praha 1", country: "CZ" },
  { code: "P2", label: "Praha 2", country: "CZ" },
  { code: "P3", label: "Praha 3", country: "CZ" },
  { code: "P4", label: "Praha 4", country: "CZ" },
  { code: "P5", label: "Praha 5", country: "CZ" },
  { code: "P6", label: "Praha 6", country: "CZ" },
  { code: "P7", label: "Praha 7", country: "CZ" },
  { code: "P8", label: "Praha 8", country: "CZ" },
  { code: "P9", label: "Praha 9", country: "CZ" },
  { code: "P10", label: "Praha 10", country: "CZ" },
];

/** Historical Czech lands — Adam's preferred grouping (Čechy × Morava/Slezsko). */
export const CZ_HISTORICAL_LANDS: RegionOption[] = [
  { code: "StČ", label: "Střední Čechy", country: "CZ" },
  { code: "JČ", label: "Jižní Čechy", country: "CZ" },
  { code: "VČ", label: "Východní Čechy", country: "CZ" },
  { code: "ZČ", label: "Západní Čechy", country: "CZ" },
  { code: "SČ", label: "Severní Čechy", country: "CZ" },
  { code: "JM", label: "Jižní Morava", country: "CZ" },
  { code: "SM", label: "Severní Morava", country: "CZ" },
];

/** Foreign countries — region stays null, only country code is set. */
export const FOREIGN_COUNTRIES: RegionOption[] = [
  { code: "AT", label: "Rakousko", country: "AT" },
  { code: "SK", label: "Slovensko", country: "SK" },
  { code: "DE", label: "Německo", country: "DE" },
  { code: "IT", label: "Itálie", country: "IT" },
  { code: "ES", label: "Španělsko", country: "ES" },
  { code: "FR", label: "Francie", country: "FR" },
  { code: "CH", label: "Švýcarsko", country: "CH" },
  { code: "HR", label: "Chorvatsko", country: "HR" },
  { code: "NL", label: "Nizozemsko", country: "NL" },
  { code: "PT", label: "Portugalsko", country: "PT" },
  { code: "PL", label: "Polsko", country: "PL" },
  { code: "SI", label: "Slovinsko", country: "SI" },
  { code: "BE", label: "Belgie", country: "BE" },
];

/** All CZ options (Prague districts + historical lands), used as the Czech section of the dropdown. */
export const CZ_REGION_OPTIONS: RegionOption[] = [
  ...PRAGUE_DISTRICTS,
  ...CZ_HISTORICAL_LANDS,
];

/** Turn a stored region/country pair into the dropdown `value` key used by the form. */
export function regionKey(region: string | null, country: string): string {
  if (country === "CZ" && region) return `CZ:${region}`;
  if (country !== "CZ") return `C:${country}`;
  return "";
}

/** Parse a dropdown `value` back into { region, country } for DB write. */
export function parseRegionKey(key: string): { region: string | null; country: string } {
  if (!key) return { region: null, country: "CZ" };
  if (key.startsWith("CZ:")) return { region: key.slice(3), country: "CZ" };
  if (key.startsWith("C:")) return { region: null, country: key.slice(2) };
  return { region: null, country: "CZ" };
}

/** Human-readable label for a stored (region, country) pair. Used in lists, charts, etc. */
export function regionLabel(region: string | null, country: string | null | undefined): string {
  if (!region && (!country || country === "CZ")) return "—";
  if (country && country !== "CZ") {
    const f = FOREIGN_COUNTRIES.find((x) => x.country === country);
    return f ? f.label : country;
  }
  if (region) {
    const m = CZ_REGION_OPTIONS.find((x) => x.code === region);
    return m ? m.label : region;
  }
  return "—";
}

/**
 * Country-only label (used e.g. in "Litry podle státu" chart).
 * Returns "Česko" for CZ and the full foreign name for known countries,
 * falling back to the raw country code when unknown ("Jiný stát…").
 */
export function countryLabel(country: string | null | undefined): string {
  if (!country || country === "CZ") return "Česko";
  const f = FOREIGN_COUNTRIES.find((x) => x.country === country);
  return f ? f.label : country;
}
