"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

/**
 * Segment-level error boundary for the authenticated app shell.
 *
 * v2.15.0 — stack trace is now hidden from end-users in production.
 *   Previously the full file paths + SQL fragments were rendered into
 *   the page, which leaked internals to anyone who hit an error.
 *   To keep Adam's debugging story alive, append `?debug=1` to the URL
 *   after a crash and the stack reappears.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isProd = process.env.NODE_ENV === "production";
  const showDebug =
    !isProd ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1");

  useEffect(() => {
    console.error("[(app) segment error]", error);
  }, [error]);

  // Auto-fetch /api/version so we know WHICH deploy the crash is on.
  // Masked production errors have the same digest across deploys — this
  // is the only way to tell whether the server rendering the error is
  // actually the newest code.
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverVersionError, setServerVersionError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/version", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { version?: string }) => {
        if (!cancelled) setServerVersion(j.version ?? "(missing)");
      })
      .catch((e) => {
        if (!cancelled) setServerVersionError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
        <AlertTriangle className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Aplikace spadla</h1>
      </div>
      <div className="card p-4 space-y-2 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900">
        {showDebug ? (
          <p className="text-sm">
            <span className="font-semibold">Zpráva:</span>{" "}
            <span className="whitespace-pre-wrap break-words">
              {error.message || "(neznámá chyba)"}
            </span>
          </p>
        ) : (
          <p className="text-sm">
            Něco se rozbilo při načítání stránky. Zkus prosím znovu nebo
            obnov okno. Pokud to potrvá, ozvi se Adamovi a pošli digest níže.
          </p>
        )}
        {error.digest && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Digest: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Client bundle: <code className="font-mono">v{APP_VERSION}</code>
          {" · "}
          Server:{" "}
          {serverVersion ? (
            <code className="font-mono">v{serverVersion}</code>
          ) : serverVersionError ? (
            <span className="text-rose-600">({serverVersionError})</span>
          ) : (
            <span className="text-slate-400">načítám…</span>
          )}
        </p>
        {showDebug && error.stack && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
              Stack
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-slate-700 dark:text-slate-300">
              {error.stack}
            </pre>
          </details>
        )}
        {!showDebug && (
          <p className="text-[10px] text-slate-400 italic">
            Pro detailní stack přidej <code className="font-mono">?debug=1</code> do URL.
          </p>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={reset} className="btn-primary text-sm">
          Zkusit znovu
        </button>
        <Link
          href="/api/admin-probe"
          prefetch={false}
          className="btn-secondary text-sm inline-flex items-center gap-1"
        >
          <Stethoscope className="h-4 w-4" />
          Diagnostika
        </Link>
        <Link href="/vehicles" className="btn-secondary text-sm">
          Zpět na vozidla
        </Link>
      </div>
    </div>
  );
}
