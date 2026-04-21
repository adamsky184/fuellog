"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Nejsi přihlášený.");
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name ?? "");
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setInfo(null);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: displayName.trim() || null });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo("Uloženo.");
  }

  if (loading) return <p className="text-sm text-slate-500">Načítám…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Můj profil</h1>
        <p className="text-slate-500 text-sm mt-1">
          Zobrazované jméno se používá při sdílení vozidel.
        </p>
      </div>

      <form onSubmit={handleSave} className="card p-5 sm:p-6 space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input className="input" value={email} disabled readOnly />
          <p className="text-xs text-slate-400 mt-1">E-mail se mění v Supabase Auth, ne tady.</p>
        </div>

        <div>
          <label className="label">Zobrazované jméno</label>
          <input
            className="input"
            placeholder="Adam"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
      </form>
    </div>
  );
}
