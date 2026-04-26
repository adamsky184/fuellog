"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { FOREIGN_COUNTRIES, formatLocation } from "@/lib/regions";
import { cityToKraj } from "@/lib/city-to-kraj";
import { CZ_HIGHWAYS, parseHighwayCode, applyHighwayCodeToAddress, guessHighwayCode } from "@/lib/highways";
import { enqueueFillUp } from "@/lib/offline-queue";
import { parseDecimal } from "@/lib/utils";
// v2.19.0 — RegionPicker nahrazuje původní mega-dropdown s 75 položkami.
//   Hierarchie: Stát (default CZ) → Kraj (jen CZ) → Praha okres (jen Praha).
import {
  RegionPicker,
  type RegionValue,
  PRAHA_KRAJ,
  OTHER_COUNTRY,
} from "@/components/region-picker";
import { PhotoOcr } from "@/components/photo-ocr";
import { RegionInfobox } from "@/components/region-infobox";
import { StationSearch, type StationPick } from "@/components/station-search";
import type { ParsedReceipt, ParsedOdometer } from "@/lib/ocr/types";
import { MapPin, Check } from "lucide-react";

const OTHER_BRAND = "__other__";

type HistoryRow = {
  station_brand: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

type Combo = {
  brand: string;
  region: string | null;
  country: string;
  city: string | null;
  address: string | null;
  count: number;
};

export default function NewFillUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: vehicleId } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandSelect, setBrandSelect] = useState<string>("");
  const [brandNew, setBrandNew] = useState<string>("");
  const [previousKm, setPreviousKm] = useState<number | undefined>(undefined);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [aiActive, setAiActive] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  // v2.6.0 — transient "✓ vyplněno z mapy" banner after a station pick, so
  // the user gets a visible ack that the map lookup actually did something.
  // Adam's feedback: "nic to nepředvyplňuji" — the fill actually worked but
  // happened silently into fields the user wasn't looking at.
  const [pickedStationLabel, setPickedStationLabel] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    odometer_km: "",
    liters: "",
    total_price: "",
    currency: "CZK",
    city: "",
    address: "",
    is_full_tank: true,
    is_highway: false,
    note: "",
  });
  // v2.19.0 — region/country držené samostatně (split z ploché region_key
  //   formy). Default Česko + nic — uživatel nemusí potvrzovat, viz Milan.
  const [region, setRegion] = useState<RegionValue>({
    country: "CZ",
    region: null,
    customCountry: "",
  });

  // v2.8.1 — pulled live ČNB rates (refreshed daily by pg_cron) so the form
  // can show "≈ XXX Kč" next to a foreign-currency total. We just read the
  // most recent row per currency from `currency_rates`.
  const [liveRateInfo, setLiveRateInfo] = useState<{
    rates: Record<string, number>;
    rateDate: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("currency_rates")
        .select("currency, czk_per_unit, rate_date")
        .order("rate_date", { ascending: false })
        .limit(40); // ~6 currencies × multiple recent days
      if (cancelled || !data) return;
      const seen: Record<string, { rate: number; date: string }> = {};
      for (const r of data) {
        if (!(r.currency in seen)) {
          seen[r.currency] = { rate: Number(r.czk_per_unit), date: r.rate_date };
        }
      }
      const rates: Record<string, number> = {};
      let mostRecentDate = "";
      for (const k of Object.keys(seen)) {
        rates[k] = seen[k].rate;
        if (seen[k].date > mostRecentDate) mostRecentDate = seen[k].date;
      }
      setLiveRateInfo({ rates, rateDate: mostRecentDate });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull last odometer reading — helps OCR disambiguate trip-meter vs total km.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("fill_ups")
        .select("odometer_km")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false })
        .order("odometer_km", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.odometer_km) setPreviousKm(data.odometer_km);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  // Check whether the current user has an AI provider configured (phase 2).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          // Column exists only after phase-2 migration — ignore errors.
          .select("ai_provider, ai_key_last4" as "*")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled && data) {
          const hasKey =
            Boolean(
              (data as unknown as { ai_provider: string | null }).ai_provider,
            ) &&
            Boolean(
              (data as unknown as { ai_key_last4: string | null }).ai_key_last4,
            );
          setAiAvailable(hasKey);
          setAiActive(hasKey); // default ON when configured
        }
      } catch {
        /* phase-1: column might not exist yet, stay disabled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load station-brand + address + combo history.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // v2.10.0 — paginated fetch; PostgREST caps a single response at 1000
      // rows regardless of .limit(), so for long histories the autocomplete
      // was effectively only sampling the most recent ~1000 fill-ups.
      const PAGE = 1000;
      const collected: HistoryRow[] = [];
      for (let from = 0; from < 50000; from += PAGE) {
        const { data: page } = await supabase
          .from("fill_ups")
          .select("station_brand, address, city, region, country")
          .eq("vehicle_id", vehicleId)
          .range(from, from + PAGE - 1);
        if (cancelled) return;
        if (!page || page.length === 0) break;
        collected.push(...(page as HistoryRow[]));
        if (page.length < PAGE) break;
      }
      if (cancelled) return;
      const rows = collected;

      // Brands — top-3 frequency then alphabetical.
      const counts = new Map<string, number>();
      for (const r of rows) {
        const b = r.station_brand?.trim();
        if (!b) continue;
        counts.set(b, (counts.get(b) ?? 0) + 1);
      }
      const entries = Array.from(counts.entries());
      entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "cs"));
      const top3 = entries.slice(0, 3).map(([b]) => b);
      const rest = entries
        .slice(3)
        .map(([b]) => b)
        .sort((a, b) => a.localeCompare(b, "cs"));
      setBrandOptions([...top3, ...rest]);

      // Distinct addresses for datalist autocomplete.
      const seen = new Set<string>();
      for (const r of rows) {
        const a = r.address?.trim();
        if (a) seen.add(a);
      }
      setAddressOptions(Array.from(seen).sort((a, b) => a.localeCompare(b, "cs")));

      // Build {brand, region, country, city, address} combo frequency.
      const comboMap = new Map<string, Combo>();
      for (const r of rows) {
        const brand = r.station_brand?.trim();
        if (!brand) continue;
        const country = (r.country ?? "CZ").trim() || "CZ";
        const region = r.region?.trim() || null;
        const city = r.city?.trim() || null;
        const address = r.address?.trim() || null;
        const key = [brand, region ?? "", country, city ?? "", address ?? ""].join("|");
        const cur = comboMap.get(key);
        if (cur) cur.count++;
        else comboMap.set(key, { brand, region, country, city, address, count: 1 });
      }
      const comboList = Array.from(comboMap.values())
        .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand, "cs"));
      setCombos(comboList);

      setBrandLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  // v2.19.0 — Auto-fill city="Praha" když user zvolí Praha okres (P1-P10).
  //   Reaguje na změnu region.region (ne region_key jako dřív).
  useEffect(() => {
    if (
      region.country === "CZ" &&
      region.region &&
      /^P([1-9]|10)$/.test(region.region)
    ) {
      if (form.city.trim() === "" || form.city === "Praha") {
        setForm((f) => ({ ...f, city: "Praha" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.region, region.country]);

  // v2.11.0 — auto-fill kraj když je rozpoznané město v lookup tabulce.
  //   v2.19.0 — trigger jen když country=CZ && region je null (nic
  //   nepřepisujeme). Recognises Plzeň, Rozvadov, Humpolec, Mladá Boleslav…
  useEffect(() => {
    if (region.country !== "CZ") return;
    if (region.region) return;
    const krajCode = cityToKraj(form.city) ?? cityToKraj(form.address);
    if (krajCode) {
      setRegion((r) => (r.region ? r : { ...r, country: "CZ", region: krajCode }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city, form.address]);

  // v2.11.0 — when the user picks a highway code, prepend "DXX · " to the
  // existing address (replacing any old DXX prefix). Stored as a separate
  // local state for clarity; the actual DB write still goes through `address`.
  const currentHighwayCode = parseHighwayCode(form.address);
  function setHighwayCode(code: string | null) {
    setForm((f) => ({ ...f, address: applyHighwayCodeToAddress(f.address, code) }));
  }

  // v2.12.0 — when "Dálnice" is on AND we know the town (Rozvadov,
  // Humpolec, Velký Beranov, …), guess the matching D-number so the
  // user doesn't have to pick it from the dropdown. Never overrides
  // an explicit code already present in the address.
  useEffect(() => {
    if (!form.is_highway) return;
    if (parseHighwayCode(form.address)) return; // already set
    const guess = guessHighwayCode(form.city) ?? guessHighwayCode(form.address);
    if (guess) {
      setForm((f) => {
        if (parseHighwayCode(f.address)) return f;
        return { ...f, address: applyHighwayCodeToAddress(f.address, guess) };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.is_highway, form.city, form.address]);

  // Resolve the currently-typed brand (select vs. free-form Jiná…)
  const currentBrand =
    brandSelect === OTHER_BRAND ? brandNew.trim() : brandSelect.trim();

  // Filter combos by current brand. Keep top 5 most frequent.
  const suggestedCombos = useMemo(() => {
    if (!currentBrand) return [];
    const lower = currentBrand.toLowerCase();
    return combos
      .filter((c) => c.brand.toLowerCase() === lower)
      .slice(0, 5);
  }, [currentBrand, combos]);

  function applyReceipt(p: ParsedReceipt, file: File) {
    setReceiptFile(file);

    // Split the OCR location string ("Praha - Vršovice, Petrohradská 216") into
    // (city, address). The comma is the most reliable split on Czech receipts;
    // without one we drop the whole string into `address` and let the user fix.
    let ocrCity: string | null = null;
    let ocrAddress: string | null = null;
    if (p.station_location) {
      const raw = p.station_location.trim();
      const commaIdx = raw.indexOf(",");
      if (commaIdx > 0) {
        const leftFull = raw.slice(0, commaIdx).trim();
        // "Praha - Vršovice" → strip district after a dash so `city` stays
        // matchable to historical rows (which store just "Praha").
        const leftCity = leftFull.split(/\s[-–]\s/)[0].trim();
        ocrCity = leftCity || null;
        ocrAddress = raw.slice(commaIdx + 1).trim() || null;
      } else {
        ocrAddress = raw || null;
      }
    }

    setForm((f) => ({
      ...f,
      liters: p.liters != null ? String(p.liters) : f.liters,
      total_price: p.total_price != null ? String(p.total_price) : f.total_price,
      currency: p.currency ?? f.currency,
      date: p.date ?? f.date,
      // Only fill location fields when empty — never clobber user edits.
      city: !f.city.trim() && ocrCity ? ocrCity : f.city,
      address: !f.address.trim() && ocrAddress ? ocrAddress : f.address,
    }));
    if (p.station_brand) {
      const upper = p.station_brand.toUpperCase();
      const match = brandOptions.find((b) => b.toUpperCase() === upper);
      if (match) {
        setBrandSelect(match);
      } else {
        setBrandSelect(OTHER_BRAND);
        setBrandNew(upper);
      }
    }
  }

  function applyOdometer(p: ParsedOdometer, file: File) {
    setOdometerFile(file);
    if (p.km != null) {
      setForm((f) => ({ ...f, odometer_km: String(p.km) }));
    }
  }

  /** Phase 2: when a user has an AI provider configured, use the edge function
   *  instead of in-browser Tesseract. Returns the same parsed shape.
   *
   *  NOTE: we call fetch() directly instead of `supabase.functions.invoke`
   *  because invoke wraps non-2xx responses in a generic
   *  "Edge function returned a non-2xx status code" string and throws away
   *  the JSON body. We want Adam to see the actual `detail` returned by
   *  ocr-parse so he knows whether it's a missing key, wrong provider,
   *  Gemini rejecting the image, etc.
   */
  async function aiDispatcher(
    file: File,
    kind: "receipt" | "odometer",
  ): Promise<ParsedReceipt | ParsedOdometer> {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error("Nejsi přihlášen — obnov stránku a zkus to znovu.");
    }
    const dataUrl = await fileToDataUrl(file);
    const payload: Record<string, unknown> = { image: dataUrl, kind };
    if (kind === "odometer" && previousKm) payload.previous_km = previousKm;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) throw new Error("Chybí NEXT_PUBLIC_SUPABASE_URL.");
    const url = `${supabaseUrl}/functions/v1/ocr-parse`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      throw new Error(
        `Nedošlo k síťovému volání edge function: ${netErr instanceof Error ? netErr.message : String(netErr)}`,
      );
    }

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const bodyObj = (body && typeof body === "object" ? body : {}) as {
        error?: string;
        detail?: string;
      };
      const label = bodyObj.error ?? "edge";
      const detail = bodyObj.detail ?? text.slice(0, 500) ?? "(bez detailu)";
      throw new Error(`${label} [${res.status}]: ${detail}`);
    }

    if (!body) throw new Error("AI nevrátila data.");
    return body as ParsedReceipt | ParsedOdometer;
  }

  /**
   * v2.5.0 — Apply a Photon geocoder station pick to the form.
   *
   * Brand: match against the dropdown options first so "shared" stations stay
   * consolidated; if there's no match we flip to "Jiná…" and prefill the free
   * text. Location: only fill empty fields so the user's edits are never
   * clobbered. Country: pokud máme ISO kód, mapujeme CZ → necháme region
   * prázdný (cityToKraj autofill ho dorovná), known foreign → set country,
   * unknown foreign → OTHER_COUNTRY + customCountry stash.
   *
   * v2.19.0 — refactor na nový (country, region) state shape.
   */
  function applyStationPick(pick: StationPick) {
    if (pick.brand) {
      const upper = pick.brand.toUpperCase();
      const match = brandOptions.find((b) => b.toUpperCase() === upper);
      if (match) {
        setBrandSelect(match);
        setBrandNew("");
      } else {
        setBrandSelect(OTHER_BRAND);
        setBrandNew(upper);
      }
    }
    const code = pick.country ? pick.country.toUpperCase() : null;
    const isKnownForeign =
      !!code && code !== "CZ" && !!FOREIGN_COUNTRIES.find((x) => x.country === code);
    const isUnknownForeign = !!code && code !== "CZ" && !isKnownForeign;

    // Vyplň jen prázdné city/address.
    setForm((f) => {
      const next = { ...f };
      if (pick.city && !next.city.trim()) next.city = pick.city;
      if (pick.address && !next.address.trim()) next.address = pick.address;
      return next;
    });

    // Aktualizuj region jen pokud se ještě nic nevyplnilo (žádný kraj/okres
    // a žádný foreign country) — neperebíjej user volbu.
    setRegion((r) => {
      const isUserUntouched =
        (r.country === "CZ" && !r.region) ||
        (r.country === OTHER_COUNTRY && !r.customCountry);
      if (!isUserUntouched) return r;
      if (isKnownForeign && code) return { country: code, region: null };
      if (isUnknownForeign && code) {
        return { country: OTHER_COUNTRY, region: null, customCountry: code };
      }
      // CZ pick — necháme cityToKraj autofill efektu, aby vyplnil kraj
      // z `pick.city`. Tady jen zajistíme, že country je CZ.
      if (code === "CZ" || !code) return { country: "CZ", region: null };
      return r;
    });

    // Show a transient "✓ Vyplněno z mapy: …" banner for 4 s so the user
    // sees that the lookup actually filled fields below the search box.
    const parts = [pick.brand, pick.city, pick.country]
      .filter(Boolean)
      .join(" · ");
    setPickedStationLabel(parts || pick.displayName);
    window.setTimeout(() => setPickedStationLabel(null), 4000);
  }

  function applyCombo(c: Combo) {
    setForm((f) => ({
      ...f,
      city: c.city ?? f.city,
      address: c.address ?? f.address,
    }));
    // v2.19.0 — set country/region directly. Pokud je country neznámý
    //   foreign code, padáme do "Jiný stát…" + custom ISO.
    if (c.country === "CZ") {
      setRegion({ country: "CZ", region: c.region });
    } else if (FOREIGN_COUNTRIES.find((x) => x.country === c.country)) {
      setRegion({ country: c.country, region: null });
    } else {
      setRegion({
        country: OTHER_COUNTRY,
        region: null,
        customCountry: c.country,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nejsi přihlášený.");
      setSaving(false);
      return;
    }

    // v2.19.0 — RegionPicker drží (country, region) přímo. Pokud je
    //   country sentinel "__other__", přečteme custom ISO; jinak je
    //   country už finální.
    let dbCountry: string;
    let dbRegion: string | null;
    if (region.country === OTHER_COUNTRY) {
      dbCountry = (region.customCountry ?? "").trim().toUpperCase() || "XX";
      dbRegion = null;
    } else {
      dbCountry = region.country || "CZ";
      dbRegion = region.region;
    }
    const brand =
      brandSelect === OTHER_BRAND
        ? brandNew.trim() || null
        : brandSelect.trim() || null;

    const payload = {
      vehicle_id: vehicleId,
      created_by: user.id,
      date: form.date,
      odometer_km: parseInt(form.odometer_km, 10),
      liters: parseDecimal(form.liters),
      total_price: parseDecimal(form.total_price),
      currency: form.currency,
      station_brand: brand,
      city: form.city.trim() || null,
      region: dbRegion,
      country: dbCountry,
      address: form.address.trim() || null,
      is_full_tank: form.is_full_tank,
      is_highway: form.is_highway,
      note: form.note.trim() || null,
    };

    // If the browser says we're offline, drop straight into IndexedDB and let
    // the OfflineSync component flush later. The server insert is identical so
    // there's no schema divergence.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await enqueueFillUp(payload);
        window.dispatchEvent(new CustomEvent("fuellog:queued"));
        setSaving(false);
        toast.success("Tankování ve frontě — odešle se po připojení");
        router.push(`/v/${vehicleId}/fill-ups`);
        router.refresh();
        return;
      } catch (err) {
        setSaving(false);
        setError(
          err instanceof Error
            ? `Offline fronta selhala: ${err.message}`
            : "Offline fronta selhala.",
        );
        toast.error("Offline fronta selhala");
        return;
      }
    }

    const { data: inserted, error } = await supabase
      .from("fill_ups")
      .insert(payload)
      .select("id")
      .single();

    // If we got a row back and any photos were captured, upload them and
    // stamp the paths onto the fill-up. Photo upload is best-effort — we
    // never fail the save because a photo didn't land.
    if (!error && inserted?.id && (receiptFile || odometerFile)) {
      try {
        const paths: { receipt_photo_path?: string; odometer_photo_path?: string } = {};
        if (receiptFile) {
          const p = await uploadPhoto(
            supabase,
            vehicleId,
            inserted.id,
            "receipt",
            receiptFile,
          );
          if (p) paths.receipt_photo_path = p;
        }
        if (odometerFile) {
          const p = await uploadPhoto(
            supabase,
            vehicleId,
            inserted.id,
            "odometer",
            odometerFile,
          );
          if (p) paths.odometer_photo_path = p;
        }
        if (Object.keys(paths).length > 0) {
          await supabase.from("fill_ups").update(paths).eq("id", inserted.id);
        }
        // v2.5.0 — if a receipt photo just landed, kick off the forward-receipt
        // edge function. The function itself silently no-ops when the vehicle
        // has no forward address configured, so calling it on every save is
        // safe and avoids a second round-trip to read the flag client-side.
        if (paths.receipt_photo_path) {
          kickoffForwardReceipt(inserted.id).catch(() => {
            /* best-effort — never block the user */
          });
        }
      } catch {
        // photo upload errors are non-fatal
      }
    }

    setSaving(false);
    if (error) {
      // Network-dropped mid-save: try to queue so we don't lose the entry.
      if (err_is_network(error)) {
        try {
          await enqueueFillUp(payload);
          window.dispatchEvent(new CustomEvent("fuellog:queued"));
          toast.success("Tankování ve frontě — odešle se po připojení");
          router.push(`/v/${vehicleId}/fill-ups`);
          router.refresh();
          return;
        } catch {
          /* fall through */
        }
      }
      setError(error.message);
      toast.error(`Uložení selhalo: ${error.message}`);
      return;
    }
    toast.success("Tankování přidáno");
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Nové tankování</h2>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-gradient-to-br from-sky-50/40 to-transparent dark:from-sky-900/10">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Rychlé vyplnění z fotky
          </div>
          {aiAvailable && (
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiActive}
                onChange={(e) => setAiActive(e.target.checked)}
                className="accent-purple-500"
              />
              Použít AI
            </label>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <PhotoOcr
            kind="receipt"
            onParsed={applyReceipt}
            onClear={() => setReceiptFile(null)}
            aiDispatcher={aiAvailable ? aiDispatcher : undefined}
            aiActive={aiActive}
          />
          <PhotoOcr
            kind="odometer"
            onParsed={applyOdometer}
            onClear={() => setOdometerFile(null)}
            previousKm={previousKm}
            aiDispatcher={aiAvailable ? aiDispatcher : undefined}
            aiActive={aiActive}
          />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {aiActive
            ? "AI načte údaje automaticky. Vždy je ale zkontroluj před uložením."
            : "OCR běží v tvém prohlížeči, nic se nikam neposílá. Výsledky prosím zkontroluj."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Datum *</label>
          <input
            required
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Stav tachometru (km) *</label>
          <input
            required
            type="number"
            min={0}
            className="input"
            value={form.odometer_km}
            onChange={(e) => setForm({ ...form, odometer_km: e.target.value })}
          />
        </div>
      </div>

      {/* v2.7.0 — on mobile we only have ~360px of width; cramming 3 inputs
          made each one tiny. Stack to 2 columns with currency taking the full
          row below; sm+ keeps the original 3-col layout. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Litry</label>
          {/* v2.19.0 — type="text" + inputMode="decimal" tak, aby šla psát
              čárka i tečka. type="number" v Chrome/Safari odmítá čárku
              hned při psaní. Validace + parsing pak řeší parseDecimal. */}
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            className="input"
            value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Celkem</label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            className="input"
            value={form.total_price}
            onChange={(e) => setForm({ ...form, total_price: e.target.value })}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label">Měna</label>
          <select
            className="input"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="CZK">CZK</option>
            <option value="EUR">EUR</option>
            <option value="CHF">CHF</option>
            <option value="PLN">PLN</option>
            <option value="HUF">HUF</option>
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
            <option value="HRK">HRK</option>
          </select>
          {/* v2.8.1 — live ≈ Kč preview when foreign currency is picked. */}
          {form.currency !== "CZK" && form.total_price && liveRateInfo && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ≈ <span className="tabular-nums font-medium">
                {Math.round((parseDecimal(form.total_price) ?? 0) * (liveRateInfo.rates[form.currency] ?? 0)).toLocaleString("cs-CZ")} Kč
              </span>
              <span className="text-slate-400"> · kurz {(liveRateInfo.rates[form.currency] ?? 0).toFixed(2)} Kč/{form.currency} ({liveRateInfo.rateDate})</span>
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="label">Pumpa</label>
        <select
          className="input"
          value={brandSelect}
          onChange={(e) => setBrandSelect(e.target.value)}
          disabled={brandLoading}
        >
          <option value="">
            {brandLoading ? "Načítám historii…" : "— vyber —"}
          </option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={OTHER_BRAND}>Jiná…</option>
        </select>
        {brandSelect === OTHER_BRAND && (
          <input
            className="input mt-2"
            placeholder="Název nové pumpy (např. Shell)"
            value={brandNew}
            onChange={(e) => setBrandNew(e.target.value)}
          />
        )}
        {!brandLoading && brandOptions.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Nejprve 3 nejpoužívanější, pak dle abecedy.
          </p>
        )}

        {/*
          v2.6.0 — Station search panel. Before the redesign this was just a
          bare <StationSearch> with an 11-px hint underneath. Adam's feedback
          was that it wasn't clear what the thing did or that it was even
          interactive. Now it has: a labeled section with a MapPin icon, a
          readable description above the input, and a transient success
          banner after a pick so the fill into Město/Region/Adresa below is
          actually visible.
        */}
        <div className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3">
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                Najít pumpu v mapě (nepovinné)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Napiš část názvu a města — dotáhneme značku, město i adresu.
              </p>
            </div>
          </div>
          <StationSearch onPick={applyStationPick} />
          {pickedStationLabel && (
            <div
              className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1.5 text-xs text-emerald-700 dark:text-emerald-300"
              role="status"
              aria-live="polite"
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Vyplněno z mapy: {pickedStationLabel}</span>
            </div>
          )}
        </div>

        {suggestedCombos.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-xs muted">
              Tady už jsi na <b>{currentBrand}</b> tankoval:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedCombos.map((c, i) => {
                const loc = formatLocation(c.city, c.region, c.country);
                const parts = [loc, c.address].filter(Boolean).join(" · ");
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyCombo(c)}
                    className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-200
                      dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                    title={`Klikni pro vyplnění (${c.count}×)`}
                  >
                    {parts || "(bez místa)"}{" "}
                    <span className="text-slate-400">· {c.count}×</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* v2.19.0 — RegionPicker komponenta nahradila plochý dropdown.
          Country defaultně CZ; kraj jen když country=CZ; Praha okres
          jen když kraj=Praha. */}
      <RegionPicker value={region} onChange={setRegion} />

      <div>
        <label className="label">Město</label>
        <input
          className="input"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
      </div>

      {/* v2.8.0 — kraj zkratky vysvětlené v rozbalovacím infoboxu. */}
      <RegionInfobox />

      <div>
        <label className="label">Adresa / detail</label>
        <input
          className="input"
          list="address-history"
          placeholder="Žernosecká"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <datalist id="address-history">
          {addressOptions.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_full_tank}
            onChange={(e) => setForm({ ...form, is_full_tank: e.target.checked })}
          />
          Plná nádrž (nutné pro správný výpočet L/100 km)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_highway}
            onChange={(e) => {
              const next = e.target.checked;
              setForm({ ...form, is_highway: next });
              // v2.11.0 — when un-toggling highway, clear any DXX prefix
              // from address so we don't leave dangling "D5" everywhere.
              if (!next && currentHighwayCode) setHighwayCode(null);
            }}
          />
          Dálnice (počítat zvlášť ve statistice)
        </label>
      </div>

      {/* v2.11.0 — explicit highway-number picker. Only rendered when
          is_highway is on. Selecting a code prepends "DXX · " to the
          address and replaces any existing DXX prefix. */}
      {form.is_highway && (
        <div>
          <label className="label">Číslo dálnice</label>
          <select
            className="input"
            value={currentHighwayCode ?? ""}
            onChange={(e) => setHighwayCode(e.target.value || null)}
          >
            <option value="">— vyber —</option>
            {CZ_HIGHWAYS.map((h) => (
              <option key={h.code} value={h.code}>
                {h.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Volba se uloží jako prefix do adresy (např. „D5 · Rozvadov").
          </p>
        </div>
      )}

      <div>
        <label className="label">Poznámka</label>
        <textarea
          className="input"
          rows={2}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Zrušit
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </form>
  );
}

function err_is_network(e: { message?: string } | null | undefined): boolean {
  const m = (e?.message ?? "").toLowerCase();
  return m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  vehicleId: string,
  fillUpId: string,
  kind: "receipt" | "odometer",
  file: File,
): Promise<string | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = /^(jpe?g|png|webp|heic|heif)$/.test(ext) ? ext : "jpg";
  const path = `${vehicleId}/${fillUpId}/${kind}-${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage
    .from("photos")
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (error) return null;
  return path;
}

/**
 * v2.5.0 — fire-and-forget kickoff for the `forward-receipt` edge function.
 *
 * The edge function itself checks the vehicle's `forward_receipts_to_email`
 * flag, so we call it unconditionally after any receipt upload. Failures are
 * swallowed; the feature is purely best-effort — the user can still see the
 * receipt in the UI either way.
 */
async function kickoffForwardReceipt(fillUpId: string): Promise<void> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return;
  const url = `${supabaseUrl}/functions/v1/forward-receipt`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      body: JSON.stringify({ fill_up_id: fillUpId }),
      // Keep the request alive even if the user navigates away immediately.
      keepalive: true,
    });
  } catch {
    /* best-effort */
  }
}
