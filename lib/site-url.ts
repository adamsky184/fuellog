/**
 * Resolve the canonical public URL of this deployment.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL — set explicitly once we own a custom domain
 *   2. VERCEL_PROJECT_PRODUCTION_URL — stable production URL on Vercel
 *   3. VERCEL_URL — per-deployment preview URL
 *   4. localhost fallback for `next dev`
 *
 * Always returned WITHOUT a trailing slash so concatenating paths is safe.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailing(ensureProtocol(explicit));

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${stripTrailing(prod)}`;

  const preview = process.env.VERCEL_URL?.trim();
  if (preview) return `https://${stripTrailing(preview)}`;

  return "http://localhost:3000";
}

function ensureProtocol(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function stripTrailing(u: string): string {
  return u.replace(/\/+$/, "");
}
