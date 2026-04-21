"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-accent text-white grid place-items-center text-2xl">⛽</div>
          <h1 className="text-2xl font-semibold">Přihlášení do FuelLogu</h1>
          <p className="text-sm text-slate-500">
            Zadej svůj email — pošleme ti jednorázový odkaz na přihlášení.
          </p>
        </div>
        <Suspense fallback={<div className="text-sm text-slate-500">Načítám…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const nextPath = params.get("next") || "/vehicles";
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        Odkaz byl odeslán na <strong>{email}</strong>. Otevři email a klikni na tlačítko pro přihlášení.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="tvuj@email.cz"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={sending || !email} className="btn-primary w-full">
        {sending ? "Odesílám…" : "Poslat přihlašovací odkaz"}
      </button>
    </form>
  );
}
