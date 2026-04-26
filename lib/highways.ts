/**
 * v2.11.0 — Czech motorway codes used by the fill-up form.
 *
 * The schema stores highway info in two fields:
 *  - `is_highway` (boolean) — toggles the "počítat zvlášť" stats split
 *  - `address`              — free text. The convention is to prefix the
 *                             highway code, e.g. "D5 · Rozvadov".
 *
 * Up to v2.10.x the user had to type "D5" manually into the address.
 * v2.11.0 adds an explicit dropdown that prepends/replaces the prefix
 * for them, so all highway entries follow the same shape.
 */

export type HighwayOption = { code: string; label: string };

/** Currently-built CZ motorway codes (D-network). Updated 2026. */
export const CZ_HIGHWAYS: HighwayOption[] = [
  { code: "D0",  label: "D0 — Pražský okruh" },
  { code: "D1",  label: "D1 — Praha–Brno–Ostrava" },
  { code: "D2",  label: "D2 — Brno–Břeclav" },
  { code: "D3",  label: "D3 — Praha–České Budějovice" },
  { code: "D4",  label: "D4 — Praha–Příbram" },
  { code: "D5",  label: "D5 — Praha–Plzeň–Rozvadov" },
  { code: "D6",  label: "D6 — Praha–Karlovy Vary–Cheb" },
  { code: "D7",  label: "D7 — Praha–Chomutov" },
  { code: "D8",  label: "D8 — Praha–Ústí–Drážďany" },
  { code: "D10", label: "D10 — Praha–Mladá Boleslav" },
  { code: "D11", label: "D11 — Praha–Hradec Králové" },
  { code: "D35", label: "D35 — Hradec Králové–Olomouc" },
  { code: "D46", label: "D46 — Vyškov–Olomouc" },
  { code: "D48", label: "D48 — Bělotín–Frýdek-Místek" },
  { code: "D52", label: "D52 — Brno–Mikulov" },
  { code: "D55", label: "D55 — Olomouc–Břeclav" },
  { code: "D56", label: "D56 — Ostrava–Frýdek-Místek" },
];

/** Read the highway code from an address string ("D5 · Rozvadov" → "D5"). */
export function parseHighwayCode(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = String(address).match(/^D\s?(\d{1,2})\b/i);
  return m ? `D${m[1]}` : null;
}

/** Strip any existing "DXX · " prefix and return the rest (or empty). */
export function stripHighwayPrefix(address: string | null | undefined): string {
  if (!address) return "";
  return String(address).replace(/^D\s?\d{1,2}\s*·?\s*/i, "").trim();
}

/**
 * Apply a chosen highway code to an existing address, preserving any
 * detail the user has already typed.
 *   ("", "D5")              → "D5"
 *   ("Rozvadov", "D5")      → "D5 · Rozvadov"
 *   ("D8 · Lovosice", "D5") → "D5 · Lovosice"
 *   ("Žernosecká", null)    → "Žernosecká"   // clearing highway code
 */
export function applyHighwayCodeToAddress(
  address: string | null | undefined,
  code: string | null,
): string {
  const rest = stripHighwayPrefix(address);
  if (!code) return rest;
  if (!rest) return code;
  return `${code} · ${rest}`;
}

/**
 * v2.12.0 — guess the most likely DXX highway code given a Czech town
 * (or any free text containing a town name). Built from the rest-area
 * lists on cesky-asfalt.cz / Wikipedia. When a town genuinely sits
 * between two motorways (e.g. Hustopeče = D2 + D52) the longer / more
 * popular highway wins. The user can always change it manually.
 */
const TOWN_TO_HIGHWAY: Record<string, string> = (() => {
  const raw: Record<string, string[]> = {
    D1: [
      "Mirošovice","Hvězdonice","Loket","Ostředek","Soutice","Psáře",
      "Senohraby","Říčany","Průhonice","Chodov","Velká Bíteš","Devět křížů",
      "Velké Meziříčí","Měřín","Velký Beranov","Humpolec","Větrný Jeníkov",
      "Jihlava","Pávov","Speřice","Pohled","Vyškov","Holubice",
      "Slavkov u Brna","Domašov","Lipník nad Bečvou","Hladké Životice",
      "Bělotín","Hranice",
    ],
    D2: ["Podivín","Velké Pavlovice","Brod nad Dyjí","Břeclav"],
    D3: ["Mezno","Měšetice","Olbramovice","Tábor","Soběslav",
         "Veselí nad Lužnicí","Bošilec","Ševětín","Dolní Bukovsko"],
    D4: ["Skalka","Mníšek pod Brdy","Dobříš","Příbram","Lety"],
    D5: ["Beroun","Žebrák","Cerhovice","Mýto","Rokycany","Ejpovice","Plzeň",
         "Sulkov","Nýřany","Stříbro","Svojšín","Kladruby","Bor","Rozvadov",
         "Pavlovice"],
    D6: ["Hostouň","Nové Strašecí","Lubná","Krupá","Řevničov",
         "Karlovy Vary","Sokolov","Cheb"],
    D7: ["Slaný","Kralupy nad Vltavou","Louny","Postoloprty","Žatec",
         "Bitozeves","Chomutov"],
    D8: ["Zdiby","Úžice","Nová Ves","Doksany","Lovosice","Bílinka",
         "Řehlovice","Trmice","Ústí nad Labem","Petrovice","Velemín",
         "Třebenice"],
    D10: ["Jirny","Stará Boleslav","Brandýs nad Labem","Stránka",
          "Mladá Boleslav","Bezděčín"],
    D11: ["Sadská","Poděbrady","Chlumec nad Cidlinou","Praskačka",
          "Hradec Králové"],
    D35: ["Holice","Vysoké Mýto","Litomyšl","Svitavy","Mohelnice","Olomouc"],
    D46: ["Prostějov","Olšany u Prostějova"],
    D48: ["Nový Jičín","Příbor","Frýdek-Místek","Třinec","Český Těšín"],
    D52: ["Rajhrad","Pohořelice","Hustopeče","Mikulov"],
    D55: ["Hulín","Otrokovice","Napajedla","Uherské Hradiště","Hodonín"],
    D56: ["Ostrava"],
  };
  const out: Record<string, string> = {};
  for (const [code, towns] of Object.entries(raw)) {
    for (const t of towns) {
      const norm = normalisePlace(t);
      if (!out[norm]) out[norm] = code;
    }
  }
  return out;
})();

function normalisePlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Best-effort highway code guess for a city / address. Returns null when
 * nothing matches. Used by the new fill-up form: when "Dálnice" is on
 * and city is recognised, we pre-select the matching DXX so the user
 * doesn't have to.
 */
export function guessHighwayCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const norm = normalisePlace(input);
  if (!norm) return null;
  if (TOWN_TO_HIGHWAY[norm]) return TOWN_TO_HIGHWAY[norm];

  for (const t of norm.split(/[\s,;·\-/]+/).filter(Boolean)) {
    if (TOWN_TO_HIGHWAY[t]) return TOWN_TO_HIGHWAY[t];
  }
  const towns = Object.keys(TOWN_TO_HIGHWAY).sort((a, b) => b.length - a.length);
  for (const t of towns) {
    if (norm.includes(t)) return TOWN_TO_HIGHWAY[t];
  }
  return null;
}
