/**
 * v2.11.0 — Czech city → kraj lookup.
 *
 * Two consumers:
 *  - the fill-up form auto-fills `region` when a recognised city is typed
 *  - a one-shot DB backfill (see migration `2026_04_26_city_to_kraj_backfill.sql`)
 *    populates `region` for historical rows that have a city/address but no kraj
 *
 * Coverage targets the ~250 largest CZ municipalities plus highway-rest-stop
 * towns that show up in real fill-up data (Rozvadov, Humpolec, Velký Beranov,
 * Lipník nad Bečvou, Hranice, …). Praha is intentionally NOT in this map —
 * Praha rows use the `P1`–`P10` district codes, not "STC".
 *
 * Lookup is diacritic-folded and lowercased so "Plzeň", "PLZEN" and "plzen"
 * all resolve. Matches are also tried against the address column (e.g.
 * "D5 sjezd Rozvadov" → PLK).
 */

import { CZ_KRAJE } from "./regions";

/** Kraj code (3-letter) keyed by ASCII-folded lowercase city name. */
const CITY_TO_KRAJ: Record<string, string> = (() => {
  const raw: Record<string, string[]> = {
    // ─── Středočeský (STC) ───────────────────────────────────────────────
    STC: [
      "Kladno", "Mladá Boleslav", "Příbram", "Beroun", "Kolín", "Kutná Hora",
      "Mělník", "Benešov", "Nymburk", "Rakovník", "Říčany", "Brandýs nad Labem",
      "Stará Boleslav", "Český Brod", "Čáslav", "Slaný", "Vlašim", "Sedlčany",
      "Hořovice", "Neratovice", "Lysá nad Labem", "Poděbrady", "Roztoky",
      "Černošice", "Velvary", "Mníšek pod Brdy", "Dobříš", "Sázava", "Štěchovice",
      "Průhonice", "Rudná", "Hostivice", "Beroun", "Buštěhrad", "Tuchlovice",
      "Mšeno", "Jesenice",
    ],
    // ─── Jihočeský (JCK) ─────────────────────────────────────────────────
    JCK: [
      "České Budějovice", "Tábor", "Písek", "Strakonice", "Jindřichův Hradec",
      "Český Krumlov", "Prachatice", "Třeboň", "Vodňany", "Soběslav", "Veselí nad Lužnicí",
      "Kaplice", "Vimperk", "Trhové Sviny", "Horní Planá", "Borovany", "Dačice",
      "Hluboká nad Vltavou", "Lišov", "Týn nad Vltavou", "Bechyně", "Milevsko",
      "Sezimovo Ústí", "Planá nad Lužnicí", "Mirovice", "Protivín",
    ],
    // ─── Plzeňský (PLK) ──────────────────────────────────────────────────
    PLK: [
      "Plzeň", "Klatovy", "Rokycany", "Sušice", "Domažlice", "Tachov",
      "Horšovský Týn", "Stříbro", "Kralovice", "Stod", "Přeštice", "Třemošná",
      "Nepomuk", "Blovice", "Zbiroh", "Nýrsko", "Manětín", "Hartmanice",
      "Plánice", "Holýšov", "Staňkov", "Kdyně", "Dobřany", "Starý Plzenec",
      "Rozvadov", "Bor", "Železná Ruda", "Bezdružice",
    ],
    // ─── Karlovarský (KVK) ───────────────────────────────────────────────
    KVK: [
      "Karlovy Vary", "Cheb", "Sokolov", "Aš", "Mariánské Lázně", "Ostrov",
      "Chodov", "Františkovy Lázně", "Habartov", "Kynšperk nad Ohří",
      "Nejdek", "Loket", "Žlutice", "Horní Slavkov", "Bochov", "Toužim",
      "Jáchymov", "Boží Dar",
    ],
    // ─── Ústecký (ULK) ───────────────────────────────────────────────────
    ULK: [
      "Ústí nad Labem", "Děčín", "Most", "Teplice", "Chomutov", "Litoměřice",
      "Louny", "Litvínov", "Žatec", "Bílina", "Roudnice nad Labem",
      "Klášterec nad Ohří", "Krupka", "Kadaň", "Rumburk", "Varnsdorf",
      "Lovosice", "Štětí", "Podbořany", "Jirkov", "Duchcov", "Meziboří",
      "Postoloprty", "Šluknov", "Česká Kamenice", "Benešov nad Ploučnicí",
    ],
    // ─── Liberecký (LBK) ─────────────────────────────────────────────────
    LBK: [
      "Liberec", "Jablonec nad Nisou", "Česká Lípa", "Turnov", "Frýdlant",
      "Semily", "Železný Brod", "Nový Bor", "Hrádek nad Nisou", "Tanvald",
      "Lomnice nad Popelkou", "Doksy", "Mimoň", "Jilemnice", "Rokytnice nad Jizerou",
      "Hodkovice nad Mohelkou", "Cvikov", "Stráž pod Ralskem", "Smržovka",
      "Velké Hamry", "Harrachov", "Desná",
    ],
    // ─── Královéhradecký (HKK) ───────────────────────────────────────────
    HKK: [
      "Hradec Králové", "Trutnov", "Náchod", "Jičín", "Rychnov nad Kněžnou",
      "Vrchlabí", "Dvůr Králové nad Labem", "Jaroměř", "Nové Město nad Metují",
      "Broumov", "Hostinné", "Police nad Metují", "Hořice", "Nová Paka",
      "Kostelec nad Orlicí", "Týniště nad Orlicí", "Třebechovice pod Orebem",
      "Solnice", "Smiřice", "Úpice", "Špindlerův Mlýn", "Pec pod Sněžkou",
      "Červený Kostelec",
    ],
    // ─── Pardubický (PAK) ────────────────────────────────────────────────
    PAK: [
      "Pardubice", "Chrudim", "Ústí nad Orlicí", "Svitavy", "Litomyšl",
      "Polička", "Vysoké Mýto", "Česká Třebová", "Choceň", "Lanškroun",
      "Hlinsko", "Skuteč", "Heřmanův Městec", "Holice", "Přelouč",
      "Moravská Třebová", "Žamberk", "Letohrad", "Králíky", "Chrast",
      "Jevíčko", "Lázně Bohdaneč", "Sezemice", "Slatiňany",
    ],
    // ─── Vysočina (VYS) ──────────────────────────────────────────────────
    VYS: [
      "Jihlava", "Třebíč", "Havlíčkův Brod", "Žďár nad Sázavou", "Pelhřimov",
      "Humpolec", "Velké Meziříčí", "Bystřice nad Pernštejnem", "Náměšť nad Oslavou",
      "Telč", "Chotěboř", "Světlá nad Sázavou", "Polná", "Nové Město na Moravě",
      "Pacov", "Moravské Budějovice", "Velký Beranov", "Bystřice nad Pernštejnem",
      "Ledeč nad Sázavou", "Hrotovice", "Žirovnice", "Jemnice", "Třešť",
    ],
    // ─── Jihomoravský (JMK) ──────────────────────────────────────────────
    JMK: [
      "Brno", "Břeclav", "Blansko", "Vyškov", "Hodonín", "Znojmo",
      "Kyjov", "Boskovice", "Mikulov", "Ivančice", "Tišnov", "Slavkov u Brna",
      "Bučovice", "Veselí nad Moravou", "Šlapanice", "Pohořelice", "Židlochovice",
      "Adamov", "Kuřim", "Modřice", "Hustopeče", "Velké Pavlovice", "Bzenec",
      "Letovice", "Strážnice", "Rosice", "Rajhrad", "Velké Bílovice", "Lednice",
      "Valtice", "Pasohlávky",
    ],
    // ─── Olomoucký (OLK) ─────────────────────────────────────────────────
    OLK: [
      "Olomouc", "Přerov", "Prostějov", "Šumperk", "Hranice", "Zábřeh",
      "Litovel", "Lipník nad Bečvou", "Mohelnice", "Šternberk", "Konice",
      "Uničov", "Jeseník", "Hlubočky", "Náměšť na Hané", "Velká Bystřice",
      "Kojetín", "Tovačov", "Plumlov", "Loštice", "Český Těšín", "Rýmařov",
      "Bruntál",
    ],
    // ─── Zlínský (ZLK) ───────────────────────────────────────────────────
    ZLK: [
      "Zlín", "Kroměříž", "Vsetín", "Uherské Hradiště", "Valašské Meziříčí",
      "Otrokovice", "Rožnov pod Radhoštěm", "Holešov", "Vizovice", "Slavičín",
      "Uherský Brod", "Bystřice pod Hostýnem", "Hulín", "Luhačovice", "Chropyně",
      "Napajedla", "Karolinka", "Velké Karlovice", "Slušovice", "Kelč",
      "Brumov-Bylnice",
    ],
    // ─── Moravskoslezský (MSK) ──────────────────────────────────────────
    MSK: [
      "Ostrava", "Havířov", "Karviná", "Frýdek-Místek", "Opava", "Třinec",
      "Nový Jičín", "Český Těšín", "Krnov", "Kopřivnice", "Bohumín",
      "Orlová", "Frýdlant nad Ostravicí", "Studénka", "Vítkov",
      "Bílovec", "Hlučín", "Příbor", "Frenštát pod Radhoštěm", "Odry",
      "Klimkovice", "Petřvald", "Rychvald", "Štramberk", "Jablunkov",
      "Český Těšín", "Bruntál",
    ],
  };

  const out: Record<string, string> = {};
  for (const [code, cities] of Object.entries(raw)) {
    for (const c of cities) {
      out[normalise(c)] = code;
    }
  }
  return out;
})();

/** ASCII-fold + lowercase for case/diacritic-insensitive matching. */
function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Match a free-text place ("Plzeň", "Plzen-Doubravka", "D5 sjezd Rozvadov")
 * to a kraj code. Returns null when nothing recognised.
 *
 * Strategy:
 *  1. exact normalised match on whole string
 *  2. exact match on each whitespace-separated token (handles "Plzeň-jih")
 *  3. substring scan: any city name contained in the input wins (covers
 *     "D5 · Rozvadov" and "Mladá Boleslav-západ")
 */
export function cityToKraj(input: string | null | undefined): string | null {
  if (!input) return null;
  const norm = normalise(input);
  if (!norm) return null;

  if (CITY_TO_KRAJ[norm]) return CITY_TO_KRAJ[norm];

  const tokens = norm.split(/[\s,;·\-/]+/).filter(Boolean);
  for (const t of tokens) {
    if (CITY_TO_KRAJ[t]) return CITY_TO_KRAJ[t];
  }

  // Substring scan — last resort, sorted by city length desc so multi-word
  // names ("mlada boleslav") win over the single-word "mlada".
  const cities = Object.keys(CITY_TO_KRAJ).sort((a, b) => b.length - a.length);
  for (const c of cities) {
    if (norm.includes(c)) return CITY_TO_KRAJ[c];
  }
  return null;
}

/** Sanity helper used by tests / dev: returns full label of the matched kraj. */
export function cityToKrajLabel(input: string | null | undefined): string | null {
  const code = cityToKraj(input);
  if (!code) return null;
  const k = CZ_KRAJE.find((x) => x.code === code);
  return k?.label ?? code;
}
