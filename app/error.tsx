"use client";

/**
 * Root error boundary.
 *
 * In production Next.js hides the actual error message behind a generic
 * "An error occurred in the Server Components render" string and only leaks
 * the `digest` hash. That digest is useless without access to the server
 * logs — so we explicitly render both the message and the digest so Adam
 * can report what's actually failing.
 */

import { useEffect } from "react";
import { APP_VERSION } from "@/lib/version";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // v2.15.0 — hide stack + raw error.message from end-users in production.
  //   Adam can still see them by appending ?debug=1 to the URL.
  const isProd = process.env.NODE_ENV === "production";
  const showDebug =
    !isProd ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1");

  useEffect(() => {
    console.error("FuelLog app error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
        Něco se rozbilo
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Stránka se nepodařila vykreslit. Zkus prosím obnovit nebo se vrátit
        na úvodní obrazovku.
      </p>
      {showDebug ? (
        <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 text-xs whitespace-pre-wrap break-all">
          {error.message || "(bez zprávy)"}
          {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          {`\n\nClient bundle: v${APP_VERSION}`}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          {error.digest && (
            <div>
              Digest: <code className="font-mono">{error.digest}</code>
            </div>
          )}
          <div>
            Client bundle: <code className="font-mono">v{APP_VERSION}</code>
          </div>
          <div className="italic text-slate-400">
            Pro detail přidej <code className="font-mono">?debug=1</code> do URL.
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => reset()} className="btn-primary text-sm">
          Zkusit znovu
        </button>
        <a href="/vehicles" className="btn-secondary text-sm">
          Domů
        </a>
      </div>
    </div>
  );
}
