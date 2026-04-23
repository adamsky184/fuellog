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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface full stack in the browser console for easy copy/paste.
    // eslint-disable-next-line no-console
    console.error("FuelLog app error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
        Něco se rozbilo
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Stránka se nepodařila vykreslit. Tady je konkrétní chyba (pošli to
        Claude, ať to opraví):
      </p>
      <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 text-xs whitespace-pre-wrap break-all">
        {error.message || "(bez zprávy)"}
        {error.digest ? `\n\nDigest: ${error.digest}` : ""}
        {error.stack ? `\n\n${error.stack}` : ""}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={() => reset()}
          className="btn-primary text-sm"
        >
          Zkusit znovu
        </button>
        <a href="/vehicles" className="btn-secondary text-sm">
          Domů
        </a>
      </div>
    </div>
  );
}
