/**
 * v2.11.0 — minimal client-side error logger.
 *
 * Sends error reports to the Supabase `error_log` table via the
 * `log_error` SECURITY DEFINER RPC (anon + authenticated may call it).
 * This is the free-tier alternative to Sentry. Admin reads come through
 * the standard PostgREST view (RLS gates SELECT to admins only).
 *
 * Designed to be **never throwing** so wrapping any code in `logError(...)`
 * is always safe — failure to log is silently swallowed.
 */

import { createClient } from "@/lib/supabase/client";

export type ErrorSeverity = "debug" | "info" | "warn" | "error" | "fatal";

export type ErrorContext = {
  /** Free-form structured context attached to the row as JSONB. */
  context?: Record<string, unknown>;
  /** Override severity (default: "error"). */
  severity?: ErrorSeverity;
};

/** Fire-and-forget error logger. Never throws, never blocks. */
export async function logError(
  message: string,
  errOrCtx?: unknown,
  ctx: ErrorContext = {},
): Promise<void> {
  try {
    const supabase = createClient();
    const stack =
      errOrCtx instanceof Error
        ? errOrCtx.stack ?? null
        : null;
    const url = typeof window !== "undefined" ? window.location.href : null;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
    let context: Record<string, unknown> | undefined = ctx.context;
    if (errOrCtx && !(errOrCtx instanceof Error) && typeof errOrCtx === "object") {
      context = { ...(errOrCtx as Record<string, unknown>), ...(context ?? {}) };
    }
    await supabase.rpc("log_error", {
      p_message: message.slice(0, 1000),
      p_severity: ctx.severity ?? "error",
      p_url: url ?? undefined,
      p_user_agent: ua ?? undefined,
      p_stack: stack ? stack.slice(0, 4000) : undefined,
      p_context: context ? (context as never) : undefined,
    });
  } catch {
    /* swallow — logging must never throw */
  }
}

/**
 * Install a window-level catch-all that funnels uncaught errors and
 * unhandled promise rejections into `logError`. Mounted once from the
 * (app)/layout.tsx ErrorBoundary client component.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __fuellogErrCatchInstalled?: boolean }).__fuellogErrCatchInstalled) {
    return;
  }
  (window as unknown as { __fuellogErrCatchInstalled: boolean }).__fuellogErrCatchInstalled = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    const err = e.error instanceof Error ? e.error : new Error(e.message);
    void logError(`window.error: ${e.message}`, err, {
      severity: "error",
      context: {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unhandled rejection";
    void logError(`unhandledrejection: ${msg}`, reason, { severity: "error" });
  });
}
