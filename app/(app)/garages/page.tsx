"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Warehouse, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Garage = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  vehicle_count: number;
};

export default function GaragesPage() {
  const [loading, setLoading] = useState(true);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  async function load() {
    setError(null);
    const supabase = createClient();
    const [garRes, vehRes] = await Promise.all([
      supabase.from("garages").select("id, name, description, created_at").order("created_at", { ascending: true }),
      supabase.from("vehicles").select("garage_id"),
    ]);
    if (garRes.error) {
      setError(garRes.error.message);
      setLoading(false);
      return;
    }
    const counts = new Map<string, number>();
    for (const v of vehRes.data ?? []) {
      if (v.garage_id) counts.set(v.garage_id, (counts.get(v.garage_id) ?? 0) + 1);
    }
    setGarages(
      (garRes.data ?? []).map((g) => ({
        ...g,
        vehicle_count: counts.get(g.id) ?? 0,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nejsi přihlášený.");
      setCreating(false);
      return;
    }
    const { error } = await supabase.from("garages").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      created_by: user.id,
    });
    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNewName("");
    setNewDesc("");
    await load();
  }

  function startEdit(g: Garage) {
    setEditingId(g.id);
    setEditName(g.name);
    setEditDesc(g.description ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("garages")
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq("id", editingId);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(g: Garage) {
    if (g.vehicle_count > 0) {
      if (
        !confirm(
          `V garáži "${g.name}" je ${g.vehicle_count} ${g.vehicle_count === 1 ? "vozidlo" : "vozidel"}. ` +
            `Smazáním se vozidla nesmažou — jen se odstraní jejich přiřazení k této garáži. Pokračovat?`,
        )
      ) {
        return;
      }
    } else if (!confirm(`Smazat garáž "${g.name}"?`)) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("garages").delete().eq("id", g.id);
    if (error) {
      setError(error.message);
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-slate-500" /> Garáže
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Organizuj svá vozidla do garáží — třeba „Rodina", „Firma", „Motorky".
        </p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-slate-500" />
          <div className="font-semibold">Nová garáž</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Název *</label>
            <input
              required
              maxLength={80}
              className="input"
              placeholder="Rodinná garáž"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Popis (volitelný)</label>
            <input
              className="input"
              placeholder="Auta doma"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={creating || !newName.trim()} className="btn-primary">
            {creating ? "Vytvářím…" : "Vytvořit"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Načítám…</p>
      ) : garages.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Zatím nemáš žádné garáže. Vytvoř si první výš.
        </div>
      ) : (
        <ul className="space-y-3">
          {garages.map((g) => (
            <li key={g.id} className="card p-4">
              {editingId === g.id ? (
                <div className="space-y-3">
                  <input
                    className="input"
                    maxLength={80}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="input"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Popis (volitelný)"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-secondary inline-flex items-center gap-1 text-sm">
                      <X className="h-3.5 w-3.5" /> Zrušit
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editName.trim()}
                      className="btn-primary inline-flex items-center gap-1 text-sm"
                    >
                      <Check className="h-3.5 w-3.5" /> Uložit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{g.name}</div>
                    {g.description && <div className="text-sm text-slate-500">{g.description}</div>}
                    <div className="text-xs text-slate-400 mt-1">
                      {g.vehicle_count === 0
                        ? "Prázdná"
                        : `${g.vehicle_count} ${g.vehicle_count === 1 ? "vozidlo" : g.vehicle_count < 5 ? "vozidla" : "vozidel"}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/vehicles?garage=${g.id}`}
                      className="btn-secondary inline-flex items-center gap-1 text-sm"
                    >
                      Zobrazit
                    </Link>
                    <button
                      onClick={() => startEdit(g)}
                      className="btn-secondary inline-flex items-center gap-1 text-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Upravit
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50 inline-flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Smazat
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
