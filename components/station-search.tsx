"use client";

/**
 * v2.5.0 — Fuel-station search autocomplete.
 *
 * Free + keyless: queries the public Photon geocoder (photon.komoot.io,
 * CORS-enabled, served from OSM data) and filters to `amenity=fuel`. No
 * API key means every user gets it for free; on the flip side the index is
 * only as good as OpenStreetMap. Good enough for Czechia and most of EU.
 *
 * Used below the "Pumpa" select on the add-fill-up form. Clicking a
 * suggestion fills brand + city + address. The component is deliberately
 * decoupled from the form shape via a single `onPick` callback.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";

export type StationPick = {
  brand: string | null;
  city: string | null;
  address: string | null;
  country: string | null;
  /** OSM feature id — stable enough for keying in a list. */
  id?: string;
  displayName: string;
};

type PhotonFeature = {
  properties?: {
    name?: string;
    brand?: string;
    operator?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    osm_id?: number;
    osm_type?: string;
    osm_value?: string;
    osm_key?: string;
  };
};

const PHOTON_URL = "https://photon.komoot.io/api/";

export function StationSearch({
  onPick,
  placeholder = "Hledat pumpu (např. Shell D1 Humpolec)",
}: {
  onPick: (pick: StationPick) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StationPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search. 350 ms keeps us under Photon's "be nice" threshold and
  // avoids firing on every keystroke while the user is still typing.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);

      const url = new URL(PHOTON_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "6");
      url.searchParams.set("lang", "cs");
      url.searchParams.set("osm_tag", "amenity:fuel");

      fetch(url.toString(), { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`Photon ${r.status}`);
          return r.json();
        })
        .then((data) => {
          const feats = Array.isArray(data?.features) ? data.features : [];
          setResults(feats.map(toPick).filter(Boolean) as StationPick[]);
          setOpen(true);
        })
        .catch((e) => {
          if (e?.name === "AbortError") return;
          setError("Vyhledávač nedostupný.");
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const el = containerRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  function reset() {
    setQ("");
    setResults([]);
    setOpen(false);
    setError(null);
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          className="input pl-8 pr-8"
          value={q}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          enterKeyHint="search"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            onClick={reset}
            aria-label="Vymazat"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {open && (results.length > 0 || error) && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          {error && (
            <div className="px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.id ?? r.displayName}
              type="button"
              onClick={() => {
                onPick(r);
                reset();
              }}
              className="w-full text-left px-3 py-2 hover:bg-sky-50 dark:hover:bg-slate-700 flex items-start gap-2 border-t border-slate-100 dark:border-slate-700 first:border-t-0"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {r.brand ?? r.displayName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {[r.address, r.city, r.country].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toPick(f: PhotonFeature): StationPick | null {
  const p = f.properties;
  if (!p) return null;
  const rawName = p.name ?? p.brand ?? p.operator ?? "(bez názvu)";
  const brand = normalizeBrand(p.brand ?? p.operator ?? p.name ?? "") || null;
  const city =
    p.city ?? p.town ?? p.village ?? p.suburb ?? p.district ?? null;
  const street = p.street ?? "";
  const housenumber = p.housenumber ?? "";
  const address =
    [street, housenumber].filter(Boolean).join(" ").trim() || null;
  const country = (p.countrycode ?? p.country ?? "").toUpperCase() || null;
  const id = p.osm_type && p.osm_id ? `${p.osm_type}/${p.osm_id}` : undefined;
  return {
    id,
    brand,
    city,
    address,
    country,
    displayName: rawName,
  };
}

/** OSM "brand" tags are casually written — normalize a few common ones. */
function normalizeBrand(raw: string): string {
  const up = raw.trim().toUpperCase();
  if (!up) return "";
  const map: Record<string, string> = {
    "ROBIN OIL": "ROBINOIL",
    HRUBÝ: "HRUBY",
    "MOL CZ": "MOL",
  };
  return map[up] ?? up;
}
