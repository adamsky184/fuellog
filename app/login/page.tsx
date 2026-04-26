"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic" | "reset";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={48}
            height={48}
            priority
            className="mx-auto w-12 h-12 rounded-xl shadow-sm ring-1 ring-white/20"
          />
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
  // v2.15.0 — guard against open-redirect: only allow same-origin paths
  // ("/something"), never absolute URLs or protocol-relative ("//evil.com").
  // Same rule as /auth/callback. Without this, a crafted invite link
  // ?next=//evil.example/x would soft-nav the user cross-origin post-login.
  const rawNext = params.get("next") || "/vehicles";
  const nextPath =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/vehicles";
  const errorParam = params.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorParam === "auth_failed" ? "Přihlašovací odkaz je neplatný nebo vypršel." : null,
  );

  function switchMode(m: Mode) {
    setMode(m);
    setInfo(null);
    setError(null);
  }

  async function handleGoogle() {
    setError(null);
    setInfo(null);
    setGoogleBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setGoogleBusy(false);
      setError(error.message);
      return;
    }
    // Supabase returns with a redirect URL; browser navigates away — no further state.
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
        // v2.6.0 — drain any pending invites addressed to this e-mail.
        try {
          await supabase.rpc("accept_pending_invites");
        } catch {
          /* non-fatal */
        }
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
          // v2.6.0 — drain any pending invites; fresh account may have been invited.
          try {
            await supabase.rpc("accept_pending_invites");
          } catch {
            /* non-fatal */
          }
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

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleBusy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <GoogleIcon />
        {googleBusy ? "Přesměrovávám…" : "Pokračovat s Google"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-400">nebo e-mailem</span>
        </div>
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

function GoogleIcon() {
  // Standard Google "G" mark — inline SVG so no extra asset/network call.
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C33.7 6 29.1 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C33.7 6 29.1 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.7-2 13.1-5.1l-6-5.1c-2 1.5-4.5 2.4-7.1 2.4-5.4 0-10-3.3-11.6-7.9l-6.5 5C9.2 39.5 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.2 5.6l6 5.1c-.4.4 6.6-4.8 6.6-14.7 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
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
