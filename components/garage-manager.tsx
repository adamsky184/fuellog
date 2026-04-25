/**
 * v2.9.2 — Inline garage management on the /vehicles homepage.
 *
 * Adam's feedback: "garáže — to je obecně špatně řešené, málokdo se
 * prokliká ke garážím". So instead of forcing a hop to /garages, we
 * surface the basic CRUD right on the homepage as a small disclosure
 * panel. Power users still have /garages for sharing & members.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GarageItem = {
  id: string;
  name: string;
  description: string | null;
  vehicle_count: number;
};

export function GarageManager({ initialGarages }: { initialGarages: GarageItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [garages, setGarages] = useState<GarageItem[]>(initialGarages);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setGarages(initialGarages), [initialGarages]);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("garages")
      .select("id, name, description")
      .order("created_at", { ascending: true });
    if (!data) return;
    // count vehicles per garage
    const { data: counts } = await supabase
      .from("vehicles")
      .select("garage_id");
    const map = new Map<string, number>();
    for (const r of (counts ?? []) as { garage_id: string | null }[]) {
      if (r.garage_id) map.set(r.garage_id, (map.get(r.garage_id) ?? 0) + 1);
    }
    setGarages(
      data.map((g) => ({ ...g, vehicle_count: map.get(g.id) ?? 0 })),
    );
  }

  async function createGarage() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setError("Nepřihlášen.");
      setBusy(false);
      return;
    }
    const { error: insErr } = await supabase
      .from("garages")
      .insert({ name: newName.trim(), created_by: u.user.id });
    setBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewName("");
    await refresh();
    router.refresh();
  }

  async function renameGarage(id: string) {
    if (!editName.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("garages")
      .update({ name: editName.trim() })
      .eq("id", id);
    setBusy(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setEditingId(null);
    setEditName("");
    await refresh();
    router.refresh();
  }

  async function deleteGarage(id: string, name: string, count: number) {
    const msg =
      count > 0
        ? `Smazat garáž "${name}"? Bude obsahovat ${count} ${
            count === 1 ? "auto" : count < 5 ? "auta" : "aut"
          } — auta zůstanou, jen nebudou v garáži.`
        : `Smazat garáž "${name}"?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    const supabase = createClient();
    // First detach vehicles (RLS ON DELETE CASCADE on vehicles.garage_id sets
    // garage_id null, but only if FK was created that way — be defensive).
    await supabase.from("vehicles").update({ garage_id: null }).eq("garage_id", id);
    const { error: delErr } = await supabase.from("garages").delete().eq("id", id);
    setBusy(false);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await refresh();
    router.refresh();
  }

  return (
    <details
      className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <Warehouse className="h-4 w-4 text-slate-400" />
        <span className="font-medium">Spravovat garáže</span>
        <span className="text-xs text-slate-400 font-normal">
          ({garages.length})
        </span>
      </summary>
      <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-700">
        <ul className="space-y-1.5">
          {garages.map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              {editingId === g.id ? (
                <>
                  <input
                    className="input flex-1 !py-1 text-sm"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameGarage(g.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => renameGarage(g.id)}
                    disabled={busy}
                    className="text-xs px-2 py-1 rounded bg-slate-900 text-white disabled:opacity-50"
                  >
                    Uložit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs px-2 py-1 rounded text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Zrušit
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate">{g.name}</span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {g.vehicle_count}×
                  </span>
                  {/* v2.10.0 — bumped tap targets from ~22 px to 36 px. */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(g.id);
                      setEditName(g.name);
                    }}
                    aria-label="Přejmenovat"
                    className="inline-flex items-center justify-center w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGarage(g.id, g.name, g.vehicle_count)}
                    aria-label="Smazat"
                    className="inline-flex items-center justify-center w-9 h-9 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <input
            className="input flex-1 !py-1 text-sm"
            placeholder="Nová garáž…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createGarage();
            }}
          />
          <button
            type="button"
            onClick={createGarage}
            disabled={busy || !newName.trim()}
            className="text-xs px-2.5 py-1 rounded bg-slate-900 text-white inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Přidat
          </button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </details>
  );
}
