/**
 * Helpers for interoperating with Next.js' internal control-flow exceptions.
 *
 * Next.js uses thrown errors to signal special control flow:
 *
 *   - `redirect()`  → throws an error with digest starting "NEXT_REDIRECT"
 *   - `notFound()`  → throws an error with digest starting "NEXT_NOT_FOUND"
 *   - `cookies()` / `headers()` / `searchParams` in a prerender context
 *                   → throws `DynamicServerError` with digest "DYNAMIC_SERVER_USAGE"
 *
 * Our defensive try/catch layers in server components MUST rethrow these so
 * Next can handle them normally. Swallowing them causes two concrete bugs:
 *
 *   1. `redirect()` silently no-ops — the user sees the stale page instead
 *      of being sent to /login.
 *   2. During `next build`, the dynamic-server signal is eaten, our catch
 *      renders an error card, and that card can then be served as a static
 *      fallback at runtime — which looks identical to the production
 *      "Server Components render error" Adam has been hitting on /admin.
 *
 * Reference: https://nextjs.org/docs/app/api-reference/functions/redirect
 */

type MaybeDigest = { digest?: unknown; message?: unknown };

export function isNextInternalError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const o = e as MaybeDigest;
  const digest = typeof o.digest === "string" ? o.digest : "";
  if (digest === "DYNAMIC_SERVER_USAGE") return true;
  if (digest.startsWith("NEXT_REDIRECT")) return true;
  if (digest.startsWith("NEXT_NOT_FOUND")) return true;
  // Fallback — some Next internals only set `message`.
  const msg = typeof o.message === "string" ? o.message : "";
  if (msg.includes("NEXT_REDIRECT")) return true;
  if (msg.includes("NEXT_NOT_FOUND")) return true;
  return false;
}

/** Throw if `e` is a Next control-flow signal; otherwise no-op. */
export function rethrowIfNextInternal(e: unknown): void {
  if (isNextInternalError(e)) throw e;
}
