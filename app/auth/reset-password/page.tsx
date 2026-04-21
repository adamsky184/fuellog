"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fuel } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Uživatel sem přišel přes /auth/callback po kliknutí na reset-link,
  // takže už má session. Když ji nemá, pošleme ho zpátky na /login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/login?error=auth_failed");
        return;
      }
      setEmail(user.email ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/vehicles");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-accent text-white grid place-items-center">
            <Fuel className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">Nové heslo</h1>
          {email && (
            <p className="text-sm text-slate-500">
              Nastavujeme heslo pro <strong>{email}</strong>.
            </p>
          )}
        </div>

        {!ready ? (
          <p className="text-sm text-slate-500 text-center">Ověřuji odkaz…</p>
        ) : done ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 text-center">
            Heslo uloženo. Přesměrovávám do aplikace…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label" htmlFor="pw">
                Nové heslo
              </label>
              <input
                id="pw"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="pw2">
                Znovu pro kontrolu
              </label>
              <input
                id="pw2"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 p-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !password || !confirmPassword}
              className="btn-primary w-full"
            >
              {busy ? "Ukládám…" : "Uložit nové heslo"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
