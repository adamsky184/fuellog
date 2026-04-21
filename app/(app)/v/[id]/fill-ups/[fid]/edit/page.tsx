"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CZ_REGION_OPTIONS,
  FOREIGN_COUNTRIES,
  PRAGUE_DISTRICTS,
  parseRegionKey,
  regionKey,
} from "@/lib/regions";

const OTHER_BRAND = "__other__";

export default function EditFillUpPage({
  params,
}: {
  params: Promise<{ id: string; fid: string }>;
}) {
  const { id: vehicleId, fid: fillUpId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandSelect, setBrandSelect] = useState<string>("");
  const [brandNew, setBrandNew] = useState<string>("");

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
          .select("station_brand")
          .eq("vehicle_id", vehicleId)
          .not("station_brand", "is", null)
          .limit(2000),
      ]);

      if (cancelled) return;

      if (rowRes.error || !rowRes.data) {
        setError(rowRes.error?.message ?? "Tankování nenalezeno.");
        setLoading(false);
        return;
      }
      const r = rowRes.data;
      const rk = regionKey(r.region, r.country);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { region, country } = parseRegionKey(form.region_key);
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
      return;
    }
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Opravdu smazat toto tankování? Tato akce je nevratná.")) return;
    setError(null);
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("fill_ups").delete().eq("id", fillUpId);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Načítám…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Upravit tankování</h2>

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
            </optgroup>
          </select>
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
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
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
            onChange={(e) => setForm({ ...form, is_highway: e.target.checked })}
          />
          Dálnice (počítat zvlášť ve statistice)
        </label>
      </div>

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
