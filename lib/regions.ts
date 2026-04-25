/**
 * Region & country taxonomy — v2.8.0 rewrite.
 *
 * Switched from historical Czech lands (StČ/JČ/VČ/…) to modern kraj
 * codes (STC/JCK/PLK/…) so data matches what drivers see on road signs
 * and SPZ (the standard 3-letter Czech kraj abbreviations).
 *
 * `code` is what we store in the `region` column.
 * `label` is the full Czech name shown in dropdowns and breakdowns.
 * `country` is the implied country.
 *
 * The DB migration `regions_to_kraje` rewrites existing historical-land
 * codes to their best-fit kraj. The mapping is lossy (one historical
 * land = up to three modern kraje) — see the migration for defaults.
 */
export type RegionOption = {
  code: string;
  label: string;
  country: string;
};

/** Praha 1–10 stays as separate codes — same as before. */
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

/** Modern Czech kraje (13 — Praha already covered by districts). */
export const CZ_KRAJE: RegionOption[] = [
  { code: "STC", label: "Středočeský", country: "CZ" },
  { code: "JCK", label: "Jihočeský", country: "CZ" },
  { code: "PLK", label: "Plzeňský", country: "CZ" },
  { code: "KVK", label: "Karlovarský", country: "CZ" },
  { code: "ULK", label: "Ústecký", country: "CZ" },
  { code: "LBK", label: "Liberecký", country: "CZ" },
  { code: "HKK", label: "Královéhradecký", country: "CZ" },
  { code: "PAK", label: "Pardubický", country: "CZ" },
  { code: "VYS", label: "Vysočina", country: "CZ" },
  { code: "JMK", label: "Jihomoravský", country: "CZ" },
  { code: "OLK", label: "Olomoucký", country: "CZ" },
  { code: "ZLK", label: "Zlínský", country: "CZ" },
  { code: "MSK", label: "Moravskoslezský", country: "CZ" },
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

/** All CZ options (Prague districts + kraje) — feeds the Czech section of the dropdown. */
export const CZ_REGION_OPTIONS: RegionOption[] = [
  ...PRAGUE_DISTRICTS,
  ...CZ_KRAJE,
];

/**
 * Legacy historic-land codes preserved as a label fallback so old data
 * still renders if anything slips past the migration. Maps each legacy
 * code to its best-fit kraj label.
 */
const LEGACY_HISTORICAL_LANDS: Record<string, string> = {
  StČ: "Středočeský",
  JČ: "Jihočeský",
  VČ: "Královéhradecký",
  ZČ: "Plzeňský",
  SČ: "Ústecký",
  JM: "Jihomoravský",
  SM: "Moravskoslezský",
};

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
    if (m) return m.label;
    if (region in LEGACY_HISTORICAL_LANDS) return LEGACY_HISTORICAL_LANDS[region];
    return region;
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

/**
 * Human-friendly "City, Region" label with dedup.
 *
 * Needed because many rows store `city="Praha"` AND `region="P7"` — naive
 * join yields "Praha, Praha 7" which Adam (rightly) called ugly. Rules:
 *  - if the region label already starts with or equals city → show region only
 *  - otherwise join `City, Region`
 *  - missing pieces are dropped silently
 *  - returns "" when there's nothing to show so callers can coalesce to "—"
 */
export function formatLocation(
  city: string | null | undefined,
  region: string | null | undefined,
  country: string | null | undefined,
): string {
  const c = (city ?? "").trim();
  const r = regionLabel(region ?? null, country ?? null);
  const hasRegion = r && r !== "—";
  if (c && hasRegion) {
    const cLower = c.toLowerCase();
    const rLower = r.toLowerCase();
    if (rLower === cLower || rLower.startsWith(cLower + " ")) return r;
    return `${c}, ${r}`;
  }
  if (c) return c;
  if (hasRegion) return r;
  return "";
}

/**
 * Static reference list for the `<RegionInfobox/>` help component so users
 * can decode the 3-letter codes (STC = Středočeský, etc.). Same arrays drive
 * the dropdown so we never drift.
 */
export const REGION_HELP: { section: string; items: { code: string; label: string }[] }[] = [
  {
    section: "Praha",
    items: PRAGUE_DISTRICTS.map((p) => ({ code: p.code, label: p.label })),
  },
  {
    section: "Kraje (mimo Prahu)",
    items: CZ_KRAJE.map((k) => ({ code: k.code, label: k.label })),
  },
  {
    section: "Zahraničí",
    items: FOREIGN_COUNTRIES.map((c) => ({ code: c.code, label: c.label })),
  },
];
