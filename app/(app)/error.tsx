"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Segment-level error boundary for the authenticated app shell.
 *
 * If `app/(app)/layout.tsx` or any nested page throws on the server, Next
 * masks `error.message` in production and only keeps `digest`. We surface
 * the digest AND the full error on screen so Adam can tell what actually
 * happened without digging through Vercel logs.
 */
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[(app) segment error]", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
        <AlertTriangle className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Aplikace spadla</h1>
      </div>
      <div className="card p-4 space-y-2 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900">
        <p className="text-sm">
          <span className="font-semibold">Zpráva:</span>{" "}
          <span className="whitespace-pre-wrap break-words">
            {error.message || "(neznámá chyba)"}
          </span>
        </p>
        {error.digest && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Digest: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        {error.stack && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
              Stack
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-snug text-slate-700 dark:text-slate-300">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn-primary text-sm">
          Zkusit znovu
        </button>
        <Link href="/vehicles" className="btn-secondary text-sm">
          Zpět na vozidla
        </Link>
      </div>
    </div>
  );
}
