"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/confirm-dialog";
import {
  CZ_REGION_OPTIONS,
  FOREIGN_COUNTRIES,
  PRAGUE_DISTRICTS,
  parseRegionKey,
  regionKey,
} from "@/lib/regions";
import { cityToKraj } from "@/lib/city-to-kraj";
import { CZ_HIGHWAYS, parseHighwayCode, applyHighwayCodeToAddress, guessHighwayCode } from "@/lib/highways";
import { formatDate } from "@/lib/utils";

const OTHER_BRAND = "__other__";
const OTHER_COUNTRY_KEY = "C:__other__";

export default function EditFillUpPage({
  params,
}: {
  params: Promise<{ id: string; fid: string }>;
}) {
  const { id: vehicleId, fid: fillUpId } = use(params);
  const router = useRouter();
  const askConfirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandSelect, setBrandSelect] = useState<string>("");
  const [brandNew, setBrandNew] = useState<string>("");
  const [customCountry, setCustomCountry] = useState<string>("");
  // v2.11.0 — provenance: who created this entry, when. Visible read-only
  // for shared vehicles so Adam knows whether he or Milan added the row.
  const [meta, setMeta] = useState<{
    createdBy: string | null;
    createdAt: string | null;
    creatorEmail: string | null;
  }>({ createdBy: null, createdAt: null, creatorEmail: null });

  const [form, setForm] = useState({
    date: "",
    odometer_km: "",
    liters: "",
    total_price: "",
    currency: "CZK",
    city: "",
    region_key: "",
    address: "",
    is_full_tank: true,
    is_highway: false,
    note: "",
  });

  // Load the existing fill-up row and the brand history in parallel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [rowRes, histRes] = await Promise.all([
        supabase.from("fill_ups").select("*").eq("id", fillUpId).single(),
        supabase
          .from("fill_ups")
          .select("station_brand, address")
          .eq("vehicle_id", vehicleId)
          .limit(2000),
      ]);

      if (cancelled) return;

      if (rowRes.error || !rowRes.data) {
        setError(rowRes.error?.message ?? "Tankování nenalezeno.");
        setLoading(false);
        return;
      }
      const r = rowRes.data;
      // v2.11.0 — fetch a human label for the creator via SECURITY DEFINER
      //   RPC `get_user_label`. The RPC enforces the same self/shares/admin
      //   gate as the narrowed profiles RLS, so it never leaks identities.
      if (r.created_by) {
        const { data: label } = await supabase.rpc("get_user_label", {
          p_user_id: r.created_by,
        });
        if (!cancelled) {
          setMeta({
            createdBy: r.created_by,
            createdAt: r.created_at ?? null,
            creatorEmail: typeof label === "string" ? label : null,
          });
        }
      }
      // Known foreign countries round-trip via regionKey; unknown codes (e.g.
      // "Jiný stát…" previously saved) need to re-enter via the custom input.
      const knownForeign = FOREIGN_COUNTRIES.some((c) => c.country === r.country);
      const isUnknownForeign = r.country !== "CZ" && !knownForeign;
      const rk = isUnknownForeign ? OTHER_COUNTRY_KEY : regionKey(r.region, r.country);
      if (isUnknownForeign) setCustomCountry(r.country ?? "");
      setForm({
        date: r.date ?? "",
        odometer_km: String(r.odometer_km ?? ""),
        liters: r.liters != null ? String(r.liters) : "",
        total_price: r.total_price != null ? String(r.total_price) : "",
        currency: r.currency ?? "CZK",
        city: r.city ?? "",
        region_key: rk,
        address: r.address ?? "",
        is_full_tank: !!r.is_full_tank,
        is_highway: !!r.is_highway,
        note: r.note ?? "",
      });

      const counts = new Map<string, number>();
      for (const row of histRes.data ?? []) {
        const b = row.station_brand?.trim();
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
      const options = [...top3, ...rest];
      setBrandOptions(options);

      // Distinct addresses for autocomplete.
      const addrs = new Set<string>();
      for (const row of histRes.data ?? []) {
        const a = row.address?.trim();
        if (a) addrs.add(a);
      }
      setAddressOptions(Array.from(addrs).sort((a, b) => a.localeCompare(b, "cs")));

      const current = r.station_brand?.trim() ?? "";
      if (current && options.includes(current)) {
        setBrandSelect(current);
      } else if (current) {
        setBrandSelect(OTHER_BRAND);
        setBrandNew(current);
      }

      setBrandLoading(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, fillUpId]);

  const praguePrefixes = useMemo(() => PRAGUE_DISTRICTS.map((p) => `CZ:${p.code}`), []);
  useEffect(() => {
    if (praguePrefixes.includes(form.region_key)) {
      if (form.city.trim() === "" || form.city === "Praha") {
        setForm((f) => ({ ...f, city: "Praha" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.region_key]);

  // v2.11.0 — auto-fill kraj when city is recognised. Only fires when
  // region is empty so we never override an explicit user choice.
  useEffect(() => {
    if (loading) return;
    if (form.region_key) return;
    const krajCode = cityToKraj(form.city) ?? cityToKraj(form.address);
    if (krajCode) {
      setForm((f) => (f.region_key ? f : { ...f, region_key: `CZ:${krajCode}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city, form.address]);

  // v2.11.0 — highway dropdown helpers (mirrors new-fill-up page).
  const currentHighwayCode = parseHighwayCode(form.address);
  function setHighwayCode(code: string | null) {
    setForm((f) => ({ ...f, address: applyHighwayCodeToAddress(f.address, code) }));
  }

  // v2.12.0 — same auto-guess as on the new-fill-up page.
  useEffect(() => {
    if (loading) return;
    if (!form.is_highway) return;
    if (parseHighwayCode(form.address)) return;
    const guess = guessHighwayCode(form.city) ?? guessHighwayCode(form.address);
    if (guess) {
      setForm((f) => {
        if (parseHighwayCode(f.address)) return f;
        return { ...f, address: applyHighwayCodeToAddress(f.address, guess) };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.is_highway, form.city, form.address]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    let region: string | null;
    let country: string;
    if (form.region_key === OTHER_COUNTRY_KEY) {
      region = null;
      country = customCountry.trim().toUpperCase() || "XX";
    } else {
      ({ region, country } = parseRegionKey(form.region_key));
    }
    const brand =
      brandSelect === OTHER_BRAND
        ? brandNew.trim() || null
        : brandSelect.trim() || null;

    const { error } = await supabase
      .from("fill_ups")
      .update({
        date: form.date,
        odometer_km: parseInt(form.odometer_km, 10),
        liters: form.liters ? parseFloat(form.liters) : null,
        total_price: form.total_price ? parseFloat(form.total_price) : null,
        currency: form.currency,
        station_brand: brand,
        city: form.city.trim() || null,
        region,
        country,
        address: form.address.trim() || null,
        is_full_tank: form.is_full_tank,
        is_highway: form.is_highway,
        note: form.note.trim() || null,
      })
      .eq("id", fillUpId);

    setSaving(false);
    if (error) {
      setError(error.message);
      toast.error(`Uložení selhalo: ${error.message}`);
      return;
    }
    toast.success("Tankování upraveno");
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: "Smazat tankování?",
      message: "Tankování bude trvale odstraněno. Akce je nevratná.",
      confirmLabel: "Smazat",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("fill_ups").delete().eq("id", fillUpId);
    setDeleting(false);
    if (error) {
      setError(error.message);
      toast.error(`Smazání selhalo: ${error.message}`);
      return;
    }
    toast.success("Tankování smazáno");
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Načítám…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Upravit tankování</h2>
      {/* v2.11.0 — provenance line (kdo přidal). Hidden until profile resolved. */}
      {(meta.creatorEmail || meta.createdAt) && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {meta.creatorEmail && (
            <>
              <span className="text-slate-400">Přidal:</span>{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {meta.creatorEmail}
              </span>
            </>
          )}
          {meta.creatorEmail && meta.createdAt && " · "}
          {meta.createdAt && (
            <>
              <span className="text-slate-400">{formatDate(meta.createdAt)}</span>
            </>
          )}
        </p>
      )}

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

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Litry</label>
          <input
            type="number"
            step="0.001"
            min={0}
            className="input"
            value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Celkem</label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="input"
            value={form.total_price}
            onChange={(e) => setForm({ ...form, total_price: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Měna</label>
          <select
            className="input"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="CZK">CZK</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Kraj / stát</label>
          <select
            className="input"
            value={form.region_key}
            onChange={(e) => setForm({ ...form, region_key: e.target.value })}
          >
            <option value="">—</option>
            <optgroup label="Praha">
              {PRAGUE_DISTRICTS.map((p) => (
                <option key={p.code} value={`CZ:${p.code}`}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Česko — kraje">
              {CZ_REGION_OPTIONS.filter((r) => !r.code.startsWith("P")).map((r) => (
                <option key={r.code} value={`CZ:${r.code}`}>
                  {r.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Zahraničí">
              {FOREIGN_COUNTRIES.map((c) => (
                <option key={c.code} value={`C:${c.country}`}>
                  {c.label}
                </option>
              ))}
              <option value={OTHER_COUNTRY_KEY}>Jiný stát…</option>
            </optgroup>
          </select>
          {form.region_key === OTHER_COUNTRY_KEY && (
            <input
              className="input mt-2 uppercase"
              placeholder="ISO kód (např. NO, HU, RO)"
              maxLength={3}
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
            />
          )}
        </div>
        <div>
          <label className="label">Město</label>
          <input
            className="input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label">Adresa / detail</label>
        <input
          className="input"
          list="address-history-edit"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <datalist id="address-history-edit">
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
              if (!next && currentHighwayCode) setHighwayCode(null);
            }}
          />
          Dálnice (počítat zvlášť ve statistice)
        </label>
      </div>

      {/* v2.11.0 — explicit highway-number picker on edit too. */}
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2 justify-between pt-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          className="btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50"
        >
          {deleting ? "Mažu…" : "Smazat"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Zrušit
          </button>
          <button type="submit" disabled={saving || deleting} className="btn-primary">
            {saving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
      </div>
    </form>
  );
}
