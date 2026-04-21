"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fuel } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic" | "reset";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-accent text-white grid place-items-center">
            <Fuel className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">FuelLog</h1>
        </div>
        <Suspense fallback={<div className="text-sm text-slate-500">Načítám…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/vehicles";
  const errorParam = params.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorParam === "auth_failed" ? "Přihlašovací odkaz je neplatný nebo vypršel." : null,
  );

  function switchMode(m: Mode) {
    setMode(m);
    setInfo(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    const supabase = createClient();
    const origin = window.location.origin;

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(nextPath);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) {
          setError("Heslo musí mít alespoň 8 znaků.");
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) throw error;
        // Pokud je v Supabase vypnuté povinné potvrzení e-mailu, dostaneme rovnou session.
        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }
        setInfo(
          `Účet vytvořen. Na adresu ${email} jsme poslali potvrzovací odkaz — klikni na něj, ať se přihlásíš.`,
        );
        return;
      }

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) throw error;
        setInfo(`Odkaz byl odeslán na ${email}. Otevři ho z e-mailu a jsi uvnitř.`);
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
        });
        if (error) throw error;
        setInfo(
          `Na adresu ${email} jsme poslali odkaz pro nastavení nového hesla.`,
        );
        return;
      }
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Něco se pokazilo.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Přihlášení"
      : mode === "signup"
        ? "Registrace"
        : mode === "magic"
          ? "Magický odkaz"
          : "Zapomenuté heslo";

  const subtitle =
    mode === "signin"
      ? "Přihlas se e-mailem a heslem."
      : mode === "signup"
        ? "Vytvoř si účet. Potvrdíš ho přes e-mail."
        : mode === "magic"
          ? "Bez hesla — přihlašovací odkaz ti přijde e-mailem."
          : "Pošleme ti odkaz pro nastavení nového hesla.";

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 text-xs rounded-lg border border-slate-200 overflow-hidden">
        <TabBtn active={mode === "signin"} onClick={() => switchMode("signin")}>
          Přihlášení
        </TabBtn>
        <TabBtn active={mode === "signup"} onClick={() => switchMode("signup")}>
          Registrace
        </TabBtn>
        <TabBtn active={mode === "magic"} onClick={() => switchMode("magic")}>
          Magický odkaz
        </TabBtn>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
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

        {(mode === "signin" || mode === "signup") && (
          <div>
            <label className="label" htmlFor="password">
              Heslo
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder={mode === "signup" ? "min. 8 znaků" : "••••••••"}
            />
            {mode === "signup" && (
              <p className="text-xs text-slate-400 mt-1">Minimálně 8 znaků.</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 p-2">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-green-800 rounded-lg bg-green-50 border border-green-200 p-2">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !email || ((mode === "signin" || mode === "signup") && !password)}
          className="btn-primary w-full"
        >
          {busy
            ? "Pracuji…"
            : mode === "signin"
              ? "Přihlásit"
              : mode === "signup"
                ? "Vytvořit účet"
                : mode === "magic"
                  ? "Poslat odkaz"
                  : "Poslat odkaz pro reset"}
        </button>
      </form>

      <div className="text-xs text-slate-500">
        {mode === "signin" && (
          <button
            type="button"
            onClick={() => switchMode("reset")}
            className="hover:text-slate-700 hover:underline"
          >
            Zapomenuté heslo?
          </button>
        )}
        {mode === "reset" && (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="hover:text-slate-700 hover:underline"
          >
            ← Zpět na přihlášení
          </button>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
