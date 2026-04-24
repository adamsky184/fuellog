"use client";

import { use, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Wrench, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  MAINTENANCE_LABELS,
  MAINTENANCE_KIND_ORDER,
  type MaintenanceKind,
} from "@/lib/maintenance";

type Row = {
  id: string;
  vehicle_id: string;
  kind: MaintenanceKind;
  date: string;
  odometer_km: number | null;
  cost: number | null;
  currency: string;
  title: string | null;
  note: string | null;
  next_due_date: string | null;
  next_due_km: number | null;
};

type FormState = {
  kind: MaintenanceKind;
  date: string;
  odometer_km: string;
  cost: string;
  currency: string;
  title: string;
  note: string;
  next_due_date: string;
  next_due_km: string;
};

const EMPTY_FORM: FormState = {
  kind: "service",
  date: new Date().toISOString().slice(0, 10),
  odometer_km: "",
  cost: "",
  currency: "CZK",
  title: "",
  note: "",
  next_due_date: "",
  next_due_km: "",
};

export default function MaintenancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: vehicleId } = use(params);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("maintenance_entries")
      .select("id, vehicle_id, kind, date, odometer_km, cost, currency, title, note, next_due_date, next_due_km")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(r: Row) {
    setEditingId(r.id);
    setForm({
      kind: r.kind,
      date: r.date,
      odometer_km: r.odometer_km?.toString() ?? "",
      cost: r.cost?.toString() ?? "",
      currency: r.currency,
      title: r.title ?? "",
      note: r.note ?? "",
      next_due_date: r.next_due_date ?? "",
      next_due_km: r.next_due_km?.toString() ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
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
    const payload = {
      vehicle_id: vehicleId,
      created_by: user.id,
      kind: form.kind,
      date: form.date,
      odometer_km: form.odometer_km ? parseInt(form.odometer_km, 10) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      currency: form.currency,
      title: form.title.trim() || null,
      note: form.note.trim() || null,
      next_due_date: form.next_due_date || null,
      next_due_km: form.next_due_km ? parseInt(form.next_due_km, 10) : null,
    };
    const { error } = editingId
      ? await supabase.from("maintenance_entries").update(payload).eq("id", editingId)
      : await supabase.from("maintenance_entries").insert(payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setShowForm(false);
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Opravdu smazat tento záznam?")) return;
    const supabase = createClient();
    await supabase.from("maintenance_entries").delete().eq("id", id);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows
    .filter((r) => r.next_due_date && r.next_due_date >= today)
    .sort((a, b) => (a.next_due_date ?? "").localeCompare(b.next_due_date ?? ""))
    .slice(0, 3);
  const overdue = rows.filter((r) => r.next_due_date && r.next_due_date < today);

  const totalSpent = rows.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Záznamů" value={String(rows.length)} />
          <Stat label="Celkem Kč" value={formatCurrency(totalSpent)} />
          <Stat
            label="Nejbližší termín"
            value={upcoming[0]?.next_due_date ? formatDate(upcoming[0].next_due_date) : "—"}
          />
        </div>
        <button onClick={openNew} className="btn-primary inline-flex items-center gap-1" type="button">
          <Plus className="h-4 w-4" />
          Přidat záznam
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="card p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-800 dark:text-amber-200">Po termínu</div>
            <ul className="mt-1 space-y-0.5">
              {overdue.map((r) => (
                <li key={r.id}>
                  {MAINTENANCE_LABELS[r.kind]} · {formatDate(r.next_due_date!)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="card p-5 space-y-3">
          <h2 className="font-semibold">{editingId ? "Upravit záznam" : "Nový servisní záznam"}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Typ *</label>
              <select
                className="input"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as MaintenanceKind })}
                required
              >
                {MAINTENANCE_KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {MAINTENANCE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Datum *</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Stav (km)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.odometer_km}
                onChange={(e) => setForm({ ...form, odometer_km: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cena</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="input"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
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
            <label className="label">Popis</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Např. Castrol 5W-30 + filtr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Příští termín (datum)</label>
              <input
                type="date"
                className="input"
                value={form.next_due_date}
                onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Příští termín (km)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.next_due_km}
                onChange={(e) => setForm({ ...form, next_due_km: e.target.value })}
              />
            </div>
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
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="btn-secondary"
            >
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Ukládám…" : "Uložit"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card p-8 text-center muted">Načítám…</div>
      ) : !rows.length ? (
        <div className="card p-8 text-center">
          <Wrench className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="muted mb-4">Zatím žádný servis. Přidej výměnu oleje, STK, nebo cokoli dalšího.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card per entry. Edit/delete as bigger touch targets. */}
          <div className="sm:hidden space-y-2">
            {rows.map((r) => {
              const dueText = [
                r.next_due_date ? formatDate(r.next_due_date) : null,
                r.next_due_km ? `${formatNumber(r.next_due_km, 0)} km` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={r.id} className="card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formatDate(r.date)}</span>
                        <span className="text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5">
                          {MAINTENANCE_LABELS[r.kind]}
                        </span>
                      </div>
                      {r.title && <div className="text-sm mt-1">{r.title}</div>}
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                        {r.odometer_km != null && (
                          <span>{formatNumber(r.odometer_km, 0)} km</span>
                        )}
                        {r.cost != null && (
                          <span className="font-medium">
                            {formatCurrency(r.cost, r.currency)}
                          </span>
                        )}
                      </div>
                      {dueText && (
                        <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          Další: {dueText}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Upravit"
                        aria-label="Upravit"
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600"
                        title="Smazat"
                        aria-label="Smazat"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop/tablet: table. */}
          <div className="card overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 text-xs uppercase">
                <tr>
                  <Th>Datum</Th>
                  <Th>Typ</Th>
                  <Th>Popis</Th>
                  <Th right>Stav km</Th>
                  <Th right>Cena</Th>
                  <Th>Další termín</Th>
                  <Th right>Akce</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <Td>{formatDate(r.date)}</Td>
                    <Td>{MAINTENANCE_LABELS[r.kind]}</Td>
                    <Td>{r.title ?? "—"}</Td>
                    <Td right>{r.odometer_km != null ? formatNumber(r.odometer_km, 0) : "—"}</Td>
                    <Td right>{r.cost != null ? formatCurrency(r.cost, r.currency) : "—"}</Td>
                    <Td>
                      {r.next_due_date ? formatDate(r.next_due_date) : ""}
                      {r.next_due_date && r.next_due_km ? " · " : ""}
                      {r.next_due_km ? `${formatNumber(r.next_due_km, 0)} km` : ""}
                      {!r.next_due_date && !r.next_due_km && "—"}
                    </Td>
                    <Td right>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Upravit"
                          type="button"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600"
                          title="Smazat"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs muted">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2 font-medium ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-3 py-2 ${right ? "text-right" : ""}`}>
      {children}
    </td>
  );
}
