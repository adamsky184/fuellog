"use client";

import { useEffect, useState } from "react";
import { KeyRound, Palette, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AccentPicker } from "@/components/accent-picker";
import { useConfirm } from "@/components/confirm-dialog";

type AiProvider = "gemini" | "openai" | "anthropic" | "openrouter";

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic (Claude)",
  openrouter: "OpenRouter",
};

const PROVIDER_HINTS: Record<AiProvider, { url: string; blurb: string }> = {
  gemini: {
    url: "https://aistudio.google.com/app/apikey",
    blurb: "Doporučeno — 1 500 požadavků/den zdarma pro Gemini 2.0 Flash.",
  },
  openai: {
    url: "https://platform.openai.com/api-keys",
    blurb: "GPT-4o-mini s vision. Žádný free tier, účtuje se za token.",
  },
  anthropic: {
    url: "https://console.anthropic.com/settings/keys",
    blurb: "Claude Haiku s vision. Free tier velmi omezený.",
  },
  openrouter: {
    url: "https://openrouter.ai/keys",
    blurb: "Proxy přes všechny modely. Některé (Qwen-VL, Llama Vision) mají free tier.",
  },
};

export default function ProfilePage() {
  const askConfirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  // Password change
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwInfo, setPwInfo] = useState<string | null>(null);

  // AI key
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiKeyLast4, setAiKeyLast4] = useState<string | null>(null);
  const [aiSavedProvider, setAiSavedProvider] = useState<AiProvider | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);

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
        .select("display_name, ai_provider, ai_key_last4")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name ?? "");
      if (profile && "ai_provider" in profile && profile.ai_provider) {
        const p = (profile.ai_provider as AiProvider) ?? null;
        if (p && p in PROVIDER_LABELS) {
          setAiSavedProvider(p);
          setAiProvider(p);
        }
      }
      if (profile && "ai_key_last4" in profile) {
        setAiKeyLast4((profile.ai_key_last4 as string | null) ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function handleAiSave(e: React.FormEvent) {
    e.preventDefault();
    setAiError(null);
    setAiInfo(null);
    const key = aiKeyInput.trim();
    if (key.length < 10) {
      setAiError("Klíč je příliš krátký.");
      return;
    }
    setAiBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_ai_key", {
      p_provider: aiProvider,
      p_api_key: key,
    });
    setAiBusy(false);
    if (error) {
      setAiError(error.message);
      return;
    }
    setAiSavedProvider(aiProvider);
    setAiKeyLast4(key.slice(-4));
    setAiKeyInput("");
    setAiInfo("Klíč uložen. Otevři si „Nové tankování“ a zapni AI u fotky.");
  }

  async function handleAiClear() {
    const ok = await askConfirm({
      title: "Odstranit AI klíč?",
      message: "Tvoje uložený AI klíč bude trvale smazán. AI autofill se vypne.",
      confirmLabel: "Odstranit",
      tone: "warn",
    });
    if (!ok) return;
    setAiBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("clear_ai_key");
    setAiBusy(false);
    if (error) {
      setAiError(error.message);
      toast.error(`Chyba: ${error.message}`);
      return;
    }
    setAiSavedProvider(null);
    setAiKeyLast4(null);
    setAiInfo("Klíč odstraněn.");
    toast.success("AI klíč odstraněn");
  }

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwInfo(null);
    if (newPw.length < 8) {
      setPwError("Heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Hesla se neshodují.");
      return;
    }
    setPwBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    setNewPw("");
    setConfirmPw("");
    setPwInfo("Heslo změněno.");
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
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold">Údaje</h2>
        </div>
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

      <form onSubmit={handleAiSave} className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h2 className="font-semibold">AI asistent — fotky účtenek</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Volitelné. Když sem vložíš vlastní API klíč, appka použije AI pro
          přesnější rozpoznání údajů z fotky účtenky a tachometru. Bez klíče
          funguje základní OCR v prohlížeči (zdarma, méně přesné).
        </p>

        {aiSavedProvider ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-900/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-emerald-800 dark:text-emerald-200">
                Uložený klíč: <b>{PROVIDER_LABELS[aiSavedProvider]}</b>
                {aiKeyLast4 && (
                  <span className="font-mono text-xs ml-1 text-emerald-700 dark:text-emerald-300">
                    …{aiKeyLast4}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleAiClear}
                disabled={aiBusy}
                className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Odstranit klíč
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <label className="label">Poskytovatel</label>
          <select
            className="input"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as AiProvider)}
          >
            {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {PROVIDER_HINTS[aiProvider].blurb}{" "}
            <a
              className="underline hover:text-accent"
              href={PROVIDER_HINTS[aiProvider].url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Získat klíč →
            </a>
          </p>
        </div>

        <div>
          <label className="label">
            {aiSavedProvider ? "Vložit nový klíč (nahradí starý)" : "API klíč"}
          </label>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="input font-mono"
            placeholder="AIza… nebo sk-… nebo podobně"
            value={aiKeyInput}
            onChange={(e) => setAiKeyInput(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Klíč je uložen v DB odděleně od profilu a nikdo kromě tebe (přes tuto stránku) ani server-side edge funkce jej nemůže přečíst.
          </p>
        </div>

        {aiError && <p className="text-sm text-red-600">{aiError}</p>}
        {aiInfo && <p className="text-sm text-emerald-600">{aiInfo}</p>}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={aiBusy || !aiKeyInput.trim()}
            className="btn-primary"
          >
            {aiBusy ? "Ukládám…" : aiSavedProvider ? "Uložit nový" : "Uložit klíč"}
          </button>
        </div>
      </form>

      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold">Vzhled</h2>
        </div>
        <AccentPicker />
      </div>

      <form onSubmit={handleChangePassword} className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold">Změna hesla</h2>
        </div>
        <p className="text-sm text-slate-500">
          Pokud ses registroval přes magický odkaz, nastavením hesla si zpřístupníš i klasické přihlášení e-mailem.
        </p>
        <div>
          <label className="label">Nové heslo</label>
          <input
            type="password"
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="min. 8 znaků"
          />
        </div>
        <div>
          <label className="label">Znovu pro kontrolu</label>
          <input
            type="password"
            minLength={8}
            autoComplete="new-password"
            className="input"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
        </div>
        {pwError && <p className="text-sm text-red-600">{pwError}</p>}
        {pwInfo && <p className="text-sm text-emerald-600">{pwInfo}</p>}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={pwBusy || !newPw || !confirmPw}
            className="btn-primary"
          >
            {pwBusy ? "Ukládám…" : "Změnit heslo"}
          </button>
        </div>
      </form>
    </div>
  );
}
