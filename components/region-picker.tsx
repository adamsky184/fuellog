"use client";

/**
 * v2.19.0 — RegionPicker
 *
 * Replaces the original single ~75-item dropdown ("Praha 1 / … / STC /
 * JCK / … / Rakousko / Slovensko / … / Jiný stát") with a progressive
 * 3-level hierarchy that matches Milan's UX feedback:
 *
 *   1. STÁT — vždy viditelný, default "CZ" (90 % případů)
 *   2. KRAJ — viditelný jen když country === "CZ"; dropdown obsahuje
 *      "Praha" jako jednu položku (nikoli 10 okresů smíchaných do flat
 *      seznamu)
 *   3. PRAHA OKRES — viditelný jen když country === "CZ" && kraj ===
 *      "PRAHA"; obsahuje P1–P10
 *   4. CUSTOM ISO — input pro neznámý stát ("__other__")
 *
 * Datová strana NEZMĚNĚNA — DB i nadále drží `country` (text) +
 * `region` (text nullable). Kraj "PRAHA" je virtual UI pojem; do DB se
 * zapisuje buď konkrétní okres (P1..P10) nebo NULL (Praha bez okresu).
 * Existing rows se naloadují korektně přes `splitForUI()`.
 *
 * Backward kompatibilita ověřena na 2152 řádcích (audit, 2026-04-26):
 *   - 1875 CZ + region (P1-P10 nebo STC/JCK/...)
 *   - 274 foreign + region=NULL
 *   - 3 CZ bez regionu
 *   - 0 country=NULL nebo foreign+region (čistá data)
 */

import { useEffect, useId, useState } from "react";
import { Globe2, MapPin } from "lucide-react";
import {
  CZ_KRAJE,
  FOREIGN_COUNTRIES,
  PRAGUE_DISTRICTS,
} from "@/lib/regions";

/** Sentinel pro Prahu jako virtuální kraj v UI (do DB neukládáme). */
export const PRAHA_KRAJ = "PRAHA";

/** Sentinel pro "Jiný stát…" (custom ISO). Country se pak vezme z customCountry. */
export const OTHER_COUNTRY = "__other__";

/**
 * Hodnota držená nadřazeným formulářem. `country` + `region` jsou ten
 * tvar, který půjde do DB; `customCountry` je jen pro UI keep-alive
 * mezi remountama.
 */
export type RegionValue = {
  /** ISO country: "CZ" | "DE" | ... nebo OTHER_COUNTRY pro custom. */
  country: string;
  /** Pro CZ: P1..P10 | STC..MSK | null. Pro foreign: vždy null. */
  region: string | null;
  /** Vyplní se jen když country === OTHER_COUNTRY. */
  customCountry?: string;
};

type UISplit = {
  /** "CZ" | "DE" | ... | OTHER_COUNTRY */
  country: string;
  /** PRAHA_KRAJ | "STC" | ... | null */
  kraj: string | null;
  /** P1..P10 | null */
  district: string | null;
};

/** (country, region) → UI split. Praha okres se promítne do `district`. */
function splitForUI(value: RegionValue): UISplit {
  const country = value.country || "CZ";
  if (country !== "CZ" && country !== OTHER_COUNTRY) {
    return { country, kraj: null, district: null };
  }
  if (country === OTHER_COUNTRY) {
    return { country, kraj: null, district: null };
  }
  // CZ
  const region = value.region;
  if (!region) return { country: "CZ", kraj: null, district: null };
  if (region.startsWith("P") && /^P([1-9]|10)$/.test(region)) {
    return { country: "CZ", kraj: PRAHA_KRAJ, district: region };
  }
  return { country: "CZ", kraj: region, district: null };
}

/** UI split → (country, region) pro zápis do DB. */
function joinFromUI(ui: UISplit, customCountry: string): RegionValue {
  if (ui.country === OTHER_COUNTRY) {
    return { country: OTHER_COUNTRY, region: null, customCountry };
  }
  if (ui.country !== "CZ") {
    return { country: ui.country, region: null };
  }
  // CZ
  if (ui.kraj === PRAHA_KRAJ) {
    return { country: "CZ", region: ui.district };
  }
  if (!ui.kraj) {
    return { country: "CZ", region: null };
  }
  return { country: "CZ", region: ui.kraj };
}

/**
 * Když parent zachová pouze `(country, region)` bez `customCountry`, tato
 * funkce odvodí jeho původní hodnotu z `country`. Pomáhá při edit page,
 * která naloaduje fill-up s neznámým ISO ("NO", "RO", ...) — country
 * bude přímo "NO" (ne OTHER_COUNTRY), protože FOREIGN_COUNTRIES seznam
 * nemusí obsahovat všechny státy.
 */
export function normaliseInitialValue(value: {
  country: string | null | undefined;
  region: string | null | undefined;
}): RegionValue {
  const country = (value.country ?? "CZ").toUpperCase();
  const region = value.region ?? null;
  if (country === "CZ") return { country: "CZ", region };
  // Známý zahraniční stát?
  const known = FOREIGN_COUNTRIES.some((c) => c.country === country);
  if (known) return { country, region: null };
  // Neznámý — vyhoditi do "Jiný stát…" + custom ISO.
  return { country: OTHER_COUNTRY, region: null, customCountry: country };
}

export function RegionPicker({
  value,
  onChange,
}: {
  value: RegionValue;
  onChange: (next: RegionValue) => void;
}) {
  const ui = splitForUI(value);
  const customCountry = value.customCountry ?? "";

  // Kraj a district selecty potřebují stabilní id pro labely.
  const idBase = useId();

  // Local flag pro "Praha je rozbalená, ale okres ještě nezvolen".
  // Bez něj by `splitForUI` při region=null vrátil kraj=null, kraj selector
  // by spadl zpět na "—" a 3. dropdown by se zavřel hned po výběru Prahy.
  // Resync s extern initem (edit page načte fill-up) přes useEffect níž.
  const [pragueExpanded, setPragueExpanded] = useState<boolean>(
    ui.kraj === PRAHA_KRAJ,
  );
  // Pokud parent změní `value` zvenku (initial load v edit, OCR autofill,
  // applyCombo, applyStationPick), sjednotíme expanded flag.
  useEffect(() => {
    if (ui.kraj === PRAHA_KRAJ) setPragueExpanded(true);
    else if (ui.country !== "CZ") setPragueExpanded(false);
    // Když cityToKraj autofill nastaví kraj=STC nebo cokoli ne-Praha,
    // automaticky zavřeme 3. úroveň.
    else if (ui.kraj && ui.kraj !== PRAHA_KRAJ) setPragueExpanded(false);
  }, [ui.country, ui.kraj]);

  function setCountry(country: string) {
    if (country === "CZ") {
      onChange({ country: "CZ", region: null });
      setPragueExpanded(false);
    } else if (country === OTHER_COUNTRY) {
      onChange({ country: OTHER_COUNTRY, region: null, customCountry });
      setPragueExpanded(false);
    } else {
      onChange({ country, region: null });
      setPragueExpanded(false);
    }
  }

  function setKraj(kraj: string) {
    if (!kraj) {
      onChange({ country: "CZ", region: null });
      setPragueExpanded(false);
      return;
    }
    if (kraj === PRAHA_KRAJ) {
      // Otevřít 3. úroveň. Region zůstává null dokud neklikne okres.
      onChange({ country: "CZ", region: null });
      setPragueExpanded(true);
      return;
    }
    onChange({ country: "CZ", region: kraj });
    setPragueExpanded(false);
  }

  function setDistrict(district: string) {
    onChange({ country: "CZ", region: district || null });
    // pragueExpanded zůstává true → kraj selector dál ukazuje "Praha"
    setPragueExpanded(true);
  }

  function setCustomCountry(code: string) {
    onChange({
      country: OTHER_COUNTRY,
      region: null,
      customCountry: code,
    });
  }

  // Kraj selector ukazuje "Praha" když je expanded NEBO když region je P1-P10.
  const krajValue =
    ui.kraj === PRAHA_KRAJ || pragueExpanded
      ? PRAHA_KRAJ
      : ui.kraj ?? "";
  const showKraj = ui.country === "CZ";
  const showDistrict = ui.country === "CZ" && krajValue === PRAHA_KRAJ;
  const showCustomIso = ui.country === OTHER_COUNTRY;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1) STÁT */}
        <div>
          <label htmlFor={`${idBase}-country`} className="label">
            <Globe2 className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom opacity-70" />
            Stát
          </label>
          <select
            id={`${idBase}-country`}
            className="input"
            value={ui.country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="CZ">Česko</option>
            {FOREIGN_COUNTRIES.map((c) => (
              <option key={c.country} value={c.country}>
                {c.label}
              </option>
            ))}
            <option value={OTHER_COUNTRY}>Jiný stát…</option>
          </select>
          {showCustomIso && (
            <input
              className="input mt-2 uppercase"
              placeholder="ISO kód (např. NO, HU, RO)"
              maxLength={3}
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
            />
          )}
        </div>

        {/* 2) KRAJ — jen pro CZ */}
        {showKraj && (
          <div>
            <label htmlFor={`${idBase}-kraj`} className="label">
              <MapPin className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom opacity-70" />
              Kraj
            </label>
            <select
              id={`${idBase}-kraj`}
              className="input"
              value={krajValue}
              onChange={(e) => setKraj(e.target.value)}
            >
              <option value="">—</option>
              <option value={PRAHA_KRAJ}>Praha</option>
              <optgroup label="Mimo Prahu">
                {CZ_KRAJE.map((k) => (
                  <option key={k.code} value={k.code}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}
      </div>

      {/* 3) PRAHA OKRES — jen když kraj=PRAHA */}
      {showDistrict && (
        <div>
          <label htmlFor={`${idBase}-district`} className="label">
            Okres v Praze
          </label>
          <select
            id={`${idBase}-district`}
            className="input"
            value={ui.district ?? ""}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">— vyber okres —</option>
            {PRAGUE_DISTRICTS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// Re-exporty pro convenience pro callsite (joinFromUI není public; helpers jsou).
export { joinFromUI, splitForUI };
