"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus, Users, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VehiclePhotoUploader } from "@/components/vehicle-photo-uploader";

type Member = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  display_name: string | null;
  email: string | null;
  joined_at: string;
  invited_by: string | null;
};

// v2.6.0 — invitations for e-mails that haven't registered yet.
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

export default function VehicleSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: vehicleId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [garages, setGarages] = useState<{ id: string; name: string }[]>([]);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
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

  // Sharing
  const [me, setMe] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Member["role"]>("editor");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  // v2.6.0 — pending (unregistered-invitee) invites for this vehicle.
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Delete-zone
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Load vehicle
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [vehRes, userRes, garRes] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", vehicleId).single(),
        supabase.auth.getUser(),
        supabase.from("garages").select("id, name").order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;

      if (userRes.data.user) setMe(userRes.data.user.id);
      setGarages(garRes.data ?? []);

      if (vehRes.error || !vehRes.data) {
        setError(vehRes.error?.message ?? "Auto nenalezeno.");
        setLoading(false);
        return;
      }
      const v = vehRes.data;
      setForm({
        name: v.name ?? "",
        make: v.make ?? "",
        model: v.model ?? "",
        year: v.year != null ? String(v.year) : "",
        license_plate: v.license_plate ?? "",
        fuel_type: v.fuel_type ?? "diesel",
        tank_capacity_liters:
          v.tank_capacity_liters != null ? String(v.tank_capacity_liters) : "",
        color: v.color ?? "#0ea5e9",
        garage_id: v.garage_id ?? "",
      });
      setPhotoPath(v.photo_path ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  async function refreshMembers() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_vehicle_members", {
      p_vehicle_id: vehicleId,
    });
    if (error) {
      setInviteMsg(`Chyba načtení: ${error.message}`);
      setMembersLoading(false);
      return;
    }
    setMembers((data ?? []) as Member[]);
    setMembersLoading(false);
  }

  // v2.6.0 — load pending (unregistered-invitee) invites for this vehicle.
  async function loadPendingVehicleInvites() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_pending_vehicle_invites", {
      p_vehicle_id: vehicleId,
    });
    if (error) return; // silent — a failure here is not worth a toast
    setPendingInvites((data ?? []) as PendingInvite[]);
  }

  useEffect(() => {
    refreshMembers();
    loadPendingVehicleInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const myRole = members.find((m) => m.user_id === me)?.role;
  const isOwner = myRole === "owner";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("vehicles")
      .update({
        name: form.name.trim(),
        make: form.make.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? parseInt(form.year, 10) : null,
        license_plate: form.license_plate.trim() || null,
        fuel_type: form.fuel_type as
          | "gasoline"
          | "diesel"
          | "lpg"
          | "electric"
          | "hybrid",
        tank_capacity_liters: form.tank_capacity_liters
          ? parseFloat(form.tank_capacity_liters)
          : null,
        color: form.color || null,
        garage_id: form.garage_id || null,
      })
      .eq("id", vehicleId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    setInviteBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_vehicle_member", {
      p_vehicle_id: vehicleId,
      p_email: inviteEmail.trim().toLowerCase(),
      p_role: inviteRole,
    });
    if (error) {
      setInviteBusy(false);
      setInviteMsg(`Chyba: ${error.message}`);
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
      setInviteMsg(`Přidáno: ${inviteEmail}`);
      setInviteEmail("");
      await Promise.all([refreshMembers(), loadPendingVehicleInvites()]);
      setInviteBusy(false);
      return;
    }
    if (res?.ok && res.pending === true) {
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
        /* swallow — fallback message below */
      }
      const label = inviteEmail;
      setInviteMsg(
        emailDelivered
          ? `Pozvánka odeslána e-mailem: ${label}. Jakmile si založí účet, automaticky se připojí.`
          : skippedReason === "no_resend_key"
            ? `Pozvánka uložena, ale e-mail nelze odeslat (chybí RESEND_API_KEY). Pošli link ${label} ručně.`
            : `Pozvánka uložena pro ${label}. E-mail se nepodařilo odeslat — zkus „Odeslat znovu" níže.`,
      );
      setInviteEmail("");
      await loadPendingVehicleInvites();
      setInviteBusy(false);
      return;
    }
    setInviteBusy(false);
    setInviteMsg("Neznámá odpověď serveru.");
  }

  // v2.6.0 — resend invite e-mail for an existing pending invite.
  async function handleResendInvite(inviteId: string, email: string) {
    setInviteMsg(null);
    const supabase = createClient();
    try {
      const fn = await supabase.functions.invoke("send-invite", {
        body: { invite_id: inviteId },
      });
      const body = fn.data as { sent: boolean; skipped?: string } | undefined;
      if (body?.sent) {
        setInviteMsg(`Pozvánka znovu odeslána: ${email}`);
      } else if (body?.skipped === "no_resend_key") {
        setInviteMsg("E-mail nelze odeslat (chybí RESEND_API_KEY).");
      } else {
        setInviteMsg("E-mail se nepodařilo odeslat.");
      }
    } catch (err) {
      setInviteMsg(`Chyba: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleCancelInvite(inviteId: string, email: string) {
    if (!confirm(`Zrušit pozvánku pro ${email}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_pending_invite", {
      p_invite_id: inviteId,
    });
    if (error) {
      setInviteMsg(`Chyba: ${error.message}`);
      return;
    }
    setInviteMsg("Pozvánka zrušena.");
    await loadPendingVehicleInvites();
  }

  async function handleChangeRole(userId: string, role: Member["role"]) {
    setInviteMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_vehicle_member_role", {
      p_vehicle_id: vehicleId,
      p_user_id: userId,
      p_role: role,
    });
    if (error) {
      setInviteMsg(`Chyba: ${error.message}`);
      return;
    }
    await refreshMembers();
  }

  async function handleRemove(userId: string, isSelf: boolean) {
    const msg = isSelf
      ? "Opravdu se chceš z tohoto auta odebrat? Ztratíš přístup."
      : "Opravdu odebrat tohoto uživatele?";
    if (!confirm(msg)) return;
    setInviteMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("remove_vehicle_member", {
      p_vehicle_id: vehicleId,
      p_user_id: userId,
    });
    if (error) {
      setInviteMsg(`Chyba: ${error.message}`);
      return;
    }
    if (isSelf) {
      router.push("/vehicles");
      router.refresh();
      return;
    }
    await refreshMembers();
  }

  async function handleDelete() {
    if (confirmName.trim() !== form.name.trim()) {
      setError("Název auta se neshoduje. Smazání zrušeno.");
      return;
    }
    if (!confirm("Opravdu smazat auto a všechna jeho tankování? Tato akce je nevratná.")) return;
    setError(null);
    setDeleting(true);
    const supabase = createClient();
    // fill_ups má ON DELETE CASCADE na vehicle_id, takže stačí smazat vozidlo.
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
    setDeleting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/vehicles");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Načítám…</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Edit vehicle */}
      <form onSubmit={handleSave} className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-slate-500" />
          <h2 className="text-lg font-semibold">Údaje o autě</h2>
        </div>

        <div>
          <label className="label">Název *</label>
          <input
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Značka</label>
            <input
              className="input"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Model</label>
            <input
              className="input"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rok</label>
            <input
              type="number"
              min={1900}
              max={2100}
              className="input"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </div>
          <div>
            <label className="label">SPZ</label>
            <input
              className="input uppercase"
              value={form.license_plate}
              onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
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
              type="number"
              step="0.1"
              className="input"
              value={form.tank_capacity_liters}
              onChange={(e) =>
                setForm({ ...form, tank_capacity_liters: e.target.value })
              }
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
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
        </div>

        {/* v2.9.0 — vehicle photo. Lives outside the form's onSubmit so the
            upload-and-update happens immediately rather than on Save. */}
        <VehiclePhotoUploader vehicleId={vehicleId} initialPath={photoPath} onChange={setPhotoPath} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Ukládám…" : "Uložit změny"}
          </button>
        </div>
      </form>

      {/* Sharing */}
      <section className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <h2 className="text-lg font-semibold">Sdílení</h2>
        </div>
        <p className="text-sm text-slate-500">
          Pozvi další uživatele, ať mohou prohlížet nebo doplňovat tankování.
          Pokud ještě nemají účet ve FuelLog, pošleme jim e-mailem pozvánku —
          jakmile se zaregistrují, automaticky se připojí.
        </p>

        {isOwner && (
          <form onSubmit={handleInvite} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="label">E-mail</label>
              <input
                required
                type="email"
                className="input"
                placeholder="kamarad@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as Member["role"])
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

        {inviteMsg &&
          (inviteMsg.startsWith("Chyba") ? (
            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-3 py-2 text-sm italic text-red-700 dark:text-red-300">
              {inviteMsg}
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">{inviteMsg}</p>
          ))}

        {membersLoading ? (
          <p className="text-sm text-slate-500">Načítám členy…</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {members.map((m) => {
              const isSelf = m.user_id === me;
              return (
                <li
                  key={m.user_id}
                  className="flex flex-wrap items-center gap-3 p-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">
                      {m.display_name || m.email || "(bez jména)"}
                      {isSelf && (
                        <span className="ml-2 text-xs text-slate-400">(ty)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {m.email || "—"}
                    </div>
                  </div>
                  {isOwner && !isSelf ? (
                    <select
                      className="text-sm rounded-md border border-slate-200 px-2 py-1 bg-white"
                      value={m.role}
                      onChange={(e) =>
                        handleChangeRole(
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
                    <span className="text-sm text-slate-600">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                  {(isOwner || isSelf) && (
                    <button
                      onClick={() => handleRemove(m.user_id, isSelf)}
                      className="btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50 text-xs inline-flex items-center gap-1"
                      title={isSelf ? "Opustit auto" : "Odebrat"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isSelf ? "Opustit" : "Odebrat"}
                    </button>
                  )}
                </li>
              );
            })}
            {members.length === 0 && (
              <li className="p-3 text-sm text-slate-500">Zatím nikdo.</li>
            )}
          </ul>
        )}

        {/* v2.6.0 — pending invites (invitee hasn't signed up yet). */}
        {isOwner && pendingInvites.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Čekající pozvánky (ještě nemají účet)
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              {pendingInvites.map((p) => (
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
                      handleResendInvite(p.invite_id, p.invited_email)
                    }
                  >
                    Odeslat znovu
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs text-rose-600"
                    onClick={() =>
                      handleCancelInvite(p.invite_id, p.invited_email)
                    }
                  >
                    Zrušit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section className="card p-5 sm:p-6 space-y-3 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Nebezpečná zóna</h2>
          </div>
          <p className="text-sm text-slate-600">
            Smazání auta také odstraní <strong>všechna jeho tankování</strong> a
            statistiky. Tato akce je nevratná.
          </p>
          <div>
            <label className="label">
              Pro potvrzení napiš název auta:{" "}
              <span className="font-semibold">{form.name}</span>
            </label>
            <input
              className="input"
              placeholder={form.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDelete}
              disabled={deleting || confirmName.trim() !== form.name.trim()}
              className="btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50 inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Mažu…" : "Smazat auto"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
