"use client";

/**
 * Admin-panel-specific error boundary — inherits from the root one but stays
 * scoped to /admin so the admin chrome stays visible and a user can bounce
 * back to the overview.
 */

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Admin panel error:", error);
  }, [error]);

  return (
    <div className="card p-5 space-y-3 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900">
      <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300">
        Admin panel se rozbil
      </h2>
      <pre className="rounded bg-slate-900 text-slate-100 p-3 text-xs whitespace-pre-wrap break-all">
        {error.message || "(bez zprávy)"}
        {error.digest ? `\n\nDigest: ${error.digest}` : ""}
      </pre>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="btn-primary text-sm">
          Zkusit znovu
        </button>
        <a href="/vehicles" className="btn-secondary text-sm">
          Zpět na vozidla
        </a>
      </div>
    </div>
  );
}
