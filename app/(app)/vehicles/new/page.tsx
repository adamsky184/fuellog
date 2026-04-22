"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GarageOpt = { id: string; name: string };

export default function NewVehiclePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [garages, setGarages] = useState<GarageOpt[]>([]);
  const [form, setForm] = useState({
    name: "",
    make: "",
    model: "",
    year: "",
    license_plate: "",
    fuel_type: "diesel",
    tank_capacity_liters: "",
    color: "#0ea5e9",
    garage_id: "",
  });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("garages")
        .select("id, name")
        .order("created_at", { ascending: true });
      setGarages(data ?? []);
    })();
  }, []);

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

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        name: form.name,
        make: form.make || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year, 10) : null,
        license_plate: form.license_plate || null,
        fuel_type: form.fuel_type as "gasoline" | "diesel" | "lpg" | "electric" | "hybrid",
        tank_capacity_liters: form.tank_capacity_liters
          ? parseFloat(form.tank_capacity_liters)
          : null,
        color: form.color || null,
        garage_id: form.garage_id || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/v/${data!.id}/fill-ups`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nové auto</h1>
        <p className="text-slate-500 text-sm mt-1">Základní info o vozidle. Vše kromě názvu je volitelné.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4">
        <div>
          <label className="label">Název *</label>
          <input
            required
            className="input"
            placeholder="Octavia"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Značka</label>
            <input
              className="input"
              placeholder="Škoda"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Model</label>
            <input
              className="input"
              placeholder="Octavia"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rok</label>
            <input
              className="input"
              type="number"
              min={1900}
              max={2100}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </div>
          <div>
            <label className="label">SPZ</label>
            <input
              className="input"
              placeholder="1A2 3456"
              value={form.license_plate}
              onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Palivo</label>
            <select
              className="input"
              value={form.fuel_type}
              onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
            >
              <option value="diesel">Nafta</option>
              <option value="gasoline">Benzín</option>
              <option value="lpg">LPG</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Elektro</option>
            </select>
          </div>
          <div>
            <label className="label">Nádrž (l)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={form.tank_capacity_liters}
              onChange={(e) => setForm({ ...form, tank_capacity_liters: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Garáž</label>
          <select
            className="input"
            value={form.garage_id}
            onChange={(e) => setForm({ ...form, garage_id: e.target.value })}
          >
            <option value="">— bez garáže —</option>
            {garages.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {garages.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Zatím nemáš žádné garáže. Můžeš je vytvořit v sekci Garáže.
            </p>
          )}
        </div>

        <div>
          <label className="label">Barva vozidla</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
            <input
              className="input flex-1"
              placeholder="#0ea5e9"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Zrušit</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Ukládám…" : "Vytvořit"}
          </button>
        </div>
      </form>
    </div>
  );
}
