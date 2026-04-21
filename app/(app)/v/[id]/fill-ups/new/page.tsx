"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CZ_REGIONS = ["P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","StČ","JČ","VČ","ZČ","SČ","JM","SM","D"];
const COUNTRIES = ["CZ","AT","SK","DE","IT","ES","FR","CH","HR","NL","PT","PL","SI","BE"];

export default function NewFillUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: vehicleId } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    odometer_km: "",
    liters: "",
    total_price: "",
    currency: "CZK",
    station_brand: "",
    city: "",
    region: "",
    country: "CZ",
    address: "",
    is_full_tank: true,
    note: "",
  });

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

    const { error } = await supabase.from("fill_ups").insert({
      vehicle_id: vehicleId,
      created_by: user.id,
      date: form.date,
      odometer_km: parseInt(form.odometer_km, 10),
      liters: form.liters ? parseFloat(form.liters) : null,
      total_price: form.total_price ? parseFloat(form.total_price) : null,
      currency: form.currency,
      station_brand: form.station_brand || null,
      city: form.city || null,
      region: form.region || null,
      country: form.country,
      address: form.address || null,
      is_full_tank: form.is_full_tank,
      note: form.note || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/v/${vehicleId}/fill-ups`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Nové tankování</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Datum *</label>
          <input required type="date" className="input"
            value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="label">Stav tachometru (km) *</label>
          <input required type="number" min={0} className="input"
            value={form.odometer_km} onChange={(e) => setForm({ ...form, odometer_km: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Litry</label>
          <input type="number" step="0.001" min={0} className="input"
            value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
        </div>
        <div>
          <label className="label">Celkem</label>
          <input type="number" step="0.01" min={0} className="input"
            value={form.total_price} onChange={(e) => setForm({ ...form, total_price: e.target.value })} />
        </div>
        <div>
          <label className="label">Měna</label>
          <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="CZK">CZK</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Pumpa (značka)</label>
        <input className="input" placeholder="Shell / OMV / Benzina…"
          value={form.station_brand} onChange={(e) => setForm({ ...form, station_brand: e.target.value })} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Stát</label>
          <select className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kraj / P1–P10</label>
          <select className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            <option value="">—</option>
            {CZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Město</label>
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="label">Adresa / detail</label>
        <input className="input" placeholder="Žernosecká"
          value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_full_tank}
          onChange={(e) => setForm({ ...form, is_full_tank: e.target.checked })} />
        Plná nádrž (nutné pro správný výpočet L/100 km)
      </label>

      <div>
        <label className="label">Poznámka</label>
        <textarea className="input" rows={2}
          value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => router.back()} className="btn-secondary">Zrušit</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </form>
  );
}
