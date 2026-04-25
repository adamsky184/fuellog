"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Warehouse,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Garage = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  vehicle_count: number;
};

type Member = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  display_name: string | null;
  email: string | null;
  joined_at: string;
  invited_by: string | null;
};

// v2.6.0 — row from list_pending_garage_invites RPC. These are invites to
// e-mail addresses that don't have a FuelLog account yet.
type PendingInvite = {
  invite_id: string;
  invited_email: string;
  role: Member["role"];
  created_at: string;
  expires_at: string;
};

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "Vlastník",
  editor: "Může upravovat",
  viewer: "Jen pro čtení",
};

export default function GaragesPage() {
  const [loading, setLoading] = useState(true);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Per-garage members state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [membersByGarage, setMembersByGarage] = useState<Record<string, Member[]>>({});
  const [membersLoadingId, setMembersLoadingId] = useState<string | null>(null);
  // v2.6.0 — pending invites (unregistered invitees) per garage.
  const [pendingByGarage, setPendingByGarage] = useState<Record<string, PendingInvite[]>>({});
  const [inviteForm, setInviteForm] = useState<{
    garageId: string | null;
    email: string;
    role: Member["role"];
  }>({ garageId: null, email: "", role: "editor" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [memberMsg, setMemberMsg] = useState<{ garageId: string; text: string } | null>(null);

  async function load() {
    setError(null);
    const supabase = createClient();
    const [garRes, vehRes, userRes] = await Promise.all([
      supabase
        .from("garages")
        .select("id, name, description, created_at")
        .order("created_at", { ascending: true }),
      supabase.from("vehicles").select("garage_id"),
      supabase.auth.getUser(),
    ]);
    if (userRes.data.user) setMe(userRes.data.user.id);
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

  async function loadMembers(garageId: string) {
    setMembersLoadingId(garageId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_garage_members", {
      p_garage_id: garageId,
    });
    if (error) {
      setMemberMsg({ garageId, text: `Chyba načtení: ${error.message}` });
      setMembersLoadingId(null);
      return;
    }
    setMembersByGarage((prev) => ({ ...prev, [garageId]: (data ?? []) as Member[] }));
    setMembersLoadingId(null);
  }

  function toggleExpand(garageId: string) {
    if (expandedId === garageId) {
      setExpandedId(null);
    } else {
      setExpandedId(garageId);
      setMemberMsg(null);
      setInviteForm({ garageId, email: "", role: "editor" });
      if (!membersByGarage[garageId]) {
        loadMembers(garageId);
      }
      // v2.6.0 — also load pending invites so the owner sees everyone who
      // was invited but hasn't signed up yet.
      if (!pendingByGarage[garageId]) {
        loadPendingGarageInvites(garageId);
      }
    }
  }

  async function handleInvite(e: React.FormEvent, garageId: string) {
    e.preventDefault();
    setMemberMsg(null);
    setInviteBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_garage_member", {
      p_garage_id: garageId,
      p_email: inviteForm.email.trim().toLowerCase(),
      p_role: inviteForm.role,
    });
    if (error) {
      setInviteBusy(false);
      setMemberMsg({ garageId, text: `Chyba: ${error.message}` });
      return;
    }
    // v2.6.0 — RPC now always returns ok:true; pending:true means the
    // invitee has no FuelLog account and we need to send them an e-mail
    // via the send-invite edge function (Resend from admin address).
    const res = data as
      | { ok: true; pending: false; user_id: string }
      | { ok: true; pending: true; invite_id: string; token: string; invited_email: string }
      | null;
    if (res?.ok && res.pending === false) {
      setMemberMsg({ garageId, text: `Přidáno: ${inviteForm.email}` });
      setInviteForm({ garageId, email: "", role: inviteForm.role });
      await Promise.all([loadMembers(garageId), loadPendingGarageInvites(garageId)]);
      setInviteBusy(false);
      return;
    }
    if (res?.ok && res.pending === true) {
      // Fire the e-mail; invite row is already in the DB regardless of
      // whether Resend succeeds, so the user can re-send later.
      let emailDelivered = false;
      let skippedReason: string | null = null;
      try {
        const fn = await supabase.functions.invoke("send-invite", {
          body: { invite_id: res.invite_id },
        });
        const body = fn.data as
          | { sent: boolean; skipped?: string; to?: string }
          | undefined;
        emailDelivered = Boolean(body?.sent);
        skippedReason = body?.skipped ?? null;
      } catch {
        /* swallow — we'll surface a fallback message */
      }
      const label = inviteForm.email;
      setMemberMsg({
        garageId,
        text: emailDelivered
          ? `Pozvánka odeslána e-mailem: ${label}. Jakmile si založí účet, automaticky se připojí.`
          : skippedReason === "no_resend_key"
            ? `Pozvánka uložena, ale e-mail nelze odeslat (chybí RESEND_API_KEY). Pošli link ${label} ručně.`
            : `Pozvánka uložena pro ${label}. E-mail se nepodařilo odeslat — zkus „Odeslat znovu" níže.`,
      });
      setInviteForm({ garageId, email: "", role: inviteForm.role });
      await loadPendingGarageInvites(garageId);
      setInviteBusy(false);
      return;
    }
    setInviteBusy(false);
    setMemberMsg({ garageId, text: "Neznámá odpověď serveru." });
  }

  // v2.6.0 — load pending (unregistered-invitee) invites for a garage.
  async function loadPendingGarageInvites(garageId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_pending_garage_invites", {
      p_garage_id: garageId,
    });
    if (error) return; // silent — a failure here is not worth a toast
    setPendingByGarage((prev) => ({
      ...prev,
      [garageId]: (data ?? []) as PendingInvite[],
    }));
  }

  async function handleResendInvite(garageId: string, inviteId: string, email: string) {
    setMemberMsg(null);
    const supabase = createClient();
    try {
      const fn = await supabase.functions.invoke("send-invite", {
        body: { invite_id: inviteId },
      });
      const body = fn.data as { sent: boolean; skipped?: string } | undefined;
      if (body?.sent) {
        setMemberMsg({ garageId, text: `Pozvánka znovu odeslána: ${email}` });
      } else if (body?.skipped === "no_resend_key") {
        setMemberMsg({
          garageId,
          text: `E-mail nelze odeslat (chybí RESEND_API_KEY).`,
        });
      } else {
        setMemberMsg({ garageId, text: `E-mail se nepodařilo odeslat.` });
      }
    } catch (e) {
      setMemberMsg({
        garageId,
        text: `Chyba: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  async function handleCancelInvite(garageId: string, inviteId: string, email: string) {
    if (!confirm(`Zrušit pozvánku pro ${email}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_pending_invite", {
      p_invite_id: inviteId,
    });
    if (error) {
      setMemberMsg({ garageId, text: `Chyba: ${error.message}` });
      return;
    }
    setMemberMsg({ garageId, text: `Pozvánka zrušena.` });
    await loadPendingGarageInvites(garageId);
  }

  async function handleChangeRole(
    garageId: string,
    userId: string,
    role: Member["role"],
  ) {
    setMemberMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_garage_member_role", {
      p_garage_id: garageId,
      p_user_id: userId,
      p_role: role,
    });
    if (error) {
      setMemberMsg({ garageId, text: `Chyba: ${error.message}` });
      return;
    }
    await loadMembers(garageId);
  }

  async function handleRemoveMember(
    garageId: string,
    userId: string,
    isSelf: boolean,
  ) {
    const msg = isSelf
      ? "Opravdu se chceš z této garáže odebrat? Ztratíš přístup."
      : "Opravdu odebrat tohoto uživatele z garáže?";
    if (!confirm(msg)) return;
    setMemberMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("remove_garage_member", {
      p_garage_id: garageId,
      p_user_id: userId,
    });
    if (error) {
      setMemberMsg({ garageId, text: `Chyba: ${error.message}` });
      return;
    }
    if (isSelf) {
      await load();
      setExpandedId(null);
      return;
    }
    await loadMembers(garageId);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-slate-500" /> Garáže
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Organizuj svá vozidla do garáží — třeba „Rodina", „Firma", „Motorky".
          Garáže můžeš sdílet s dalšími uživateli.
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
          {garages.map((g) => {
            const isExpanded = expandedId === g.id;
            const members = membersByGarage[g.id] ?? [];
            const myRole = members.find((m) => m.user_id === me)?.role;
            const isOwner = myRole === "owner";
            const currentMsg = memberMsg?.garageId === g.id ? memberMsg.text : null;
            return (
              <li key={g.id} id={`g-${g.id}`} className="card p-4">
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
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary inline-flex items-center gap-1 text-sm"
                      >
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
                  <>
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-semibold">{g.name}</div>
                        {g.description && (
                          <div className="text-sm text-slate-500">{g.description}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">
                          {g.vehicle_count === 0
                            ? "Prázdná"
                            : `${g.vehicle_count} ${g.vehicle_count === 1 ? "vozidlo" : g.vehicle_count < 5 ? "vozidla" : "vozidel"}`}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => toggleExpand(g.id)}
                          className="btn-secondary inline-flex items-center gap-1 text-sm"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Členové
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
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

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          <div className="font-semibold text-sm">Sdílení</div>
                        </div>
                        <p className="text-xs text-slate-500">
                          Pozvaní členové uvidí a (podle role) budou moci upravovat
                          všechna vozidla v této garáži. Pokud ještě nemají účet,
                          pošleme jim e-mail — po registraci se připojí automaticky.
                        </p>

                        {isOwner && (
                          <form
                            onSubmit={(e) => handleInvite(e, g.id)}
                            className="flex flex-wrap gap-2 items-end"
                          >
                            <div className="flex-1 min-w-[200px]">
                              <label className="label">E-mail</label>
                              <input
                                required
                                type="email"
                                className="input"
                                placeholder="kamarad@example.com"
                                value={inviteForm.garageId === g.id ? inviteForm.email : ""}
                                onChange={(e) =>
                                  setInviteForm({
                                    garageId: g.id,
                                    email: e.target.value,
                                    role:
                                      inviteForm.garageId === g.id
                                        ? inviteForm.role
                                        : "editor",
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="label">Role</label>
                              <select
                                className="input"
                                value={
                                  inviteForm.garageId === g.id ? inviteForm.role : "editor"
                                }
                                onChange={(e) =>
                                  setInviteForm({
                                    garageId: g.id,
                                    email:
                                      inviteForm.garageId === g.id ? inviteForm.email : "",
                                    role: e.target.value as Member["role"],
                                  })
                                }
                              >
                                <option value="editor">Může upravovat</option>
                                <option value="viewer">Jen pro čtení</option>
                                <option value="owner">Vlastník</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={inviteBusy}
                              className="btn-primary inline-flex items-center gap-1"
                            >
                              <UserPlus className="h-4 w-4" />
                              {inviteBusy ? "…" : "Pozvat"}
                            </button>
                          </form>
                        )}

                        {currentMsg &&
                          (currentMsg.startsWith("Chyba") ? (
                            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-3 py-2 text-sm italic text-red-700 dark:text-red-300">
                              {currentMsg}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {currentMsg}
                            </p>
                          ))}

                        {membersLoadingId === g.id && !members.length ? (
                          <p className="text-sm text-slate-500">Načítám členy…</p>
                        ) : (
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg">
                            {members.map((m) => {
                              const isSelf = m.user_id === me;
                              return (
                                <li
                                  key={m.user_id}
                                  className="flex flex-wrap items-center gap-3 p-3"
                                >
                                  <div className="flex-1 min-w-[180px]">
                                    <div className="font-medium text-sm">
                                      {m.display_name || m.email || "(bez jména)"}
                                      {isSelf && (
                                        <span className="ml-2 text-xs text-slate-400">
                                          (ty)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {m.email || "—"}
                                    </div>
                                  </div>
                                  {isOwner && !isSelf ? (
                                    <select
                                      className="text-sm rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 bg-white dark:bg-slate-900"
                                      value={m.role}
                                      onChange={(e) =>
                                        handleChangeRole(
                                          g.id,
                                          m.user_id,
                                          e.target.value as Member["role"],
                                        )
                                      }
                                    >
                                      <option value="owner">Vlastník</option>
                                      <option value="editor">Může upravovat</option>
                                      <option value="viewer">Jen pro čtení</option>
                                    </select>
                                  ) : (
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                      {ROLE_LABEL[m.role]}
                                    </span>
                                  )}
                                  {(isOwner || isSelf) && (
                                    <button
                                      onClick={() =>
                                        handleRemoveMember(g.id, m.user_id, isSelf)
                                      }
                                      className="btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50 text-xs inline-flex items-center gap-1"
                                      title={isSelf ? "Opustit garáž" : "Odebrat"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {isSelf ? "Opustit" : "Odebrat"}
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                            {members.length === 0 && membersLoadingId !== g.id && (
                              <li className="p-3 text-sm text-slate-500">Zatím nikdo.</li>
                            )}
                          </ul>
                        )}

                        {/* v2.6.0 — pending invites. These are e-mails the
                            owner invited before the recipient had a FuelLog
                            account. Shown with a Resend / Cancel affordance
                            so the owner isn't blind to "awaiting signup". */}
                        {isOwner && (pendingByGarage[g.id]?.length ?? 0) > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-1">
                              Čekající pozvánky (ještě nemají účet)
                            </div>
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                              {(pendingByGarage[g.id] ?? []).map((p) => (
                                <li
                                  key={p.invite_id}
                                  className="flex flex-wrap items-center gap-2 p-3 text-sm"
                                >
                                  <div className="flex-1 min-w-[180px]">
                                    <div className="font-medium truncate">{p.invited_email}</div>
                                    <div className="text-xs text-slate-500">
                                      {ROLE_LABEL[p.role]} · pozvánka platí do{" "}
                                      {new Date(p.expires_at).toLocaleDateString("cs-CZ")}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-secondary text-xs"
                                    onClick={() =>
                                      handleResendInvite(g.id, p.invite_id, p.invited_email)
                                    }
                                  >
                                    Odeslat znovu
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary text-xs text-rose-600"
                                    onClick={() =>
                                      handleCancelInvite(g.id, p.invite_id, p.invited_email)
                                    }
                                  >
                                    Zrušit
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
