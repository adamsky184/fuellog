/* FuelLog Service Worker
 *
 * Cache strategy:
 *  - Next.js static assets (/_next/static/*, /icons/*, manifest, favicon) → cache-first
 *  - Navigations (HTML requests) → network-first with a stale-cache fallback, then /offline
 *  - Same-origin GET API-ish responses → stale-while-revalidate is intentionally NOT used for
 *    Supabase auth or data — we always skip them below so the SW never serves a stale user.
 *
 * Bump CACHE_VERSION on any shape change to force invalidation.
 */

// Bump on HTML-cache shape change OR to forcibly evict old shell state.
// v2.10.0: bundled release — security tightening (admin-probe gate,
// open-redirect fix, security_invoker on stats views), paginated fetches
// for fill-ups list / xlsx export / brand history, year-of-manufacture
// surfaced in homepage fleet summary + per-vehicle annual report,
// and tap-target sizes bumped to 36 px.
const CACHE_VERSION = "fuellog-v2.10.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

const APP_SHELL = [
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico"
  );
}

function isSupabase(url) {
  return url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch Supabase — auth, data, storage all go straight to network.
  if (isSupabase(url)) return;

  // Different origin (fonts, CDNs) — let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // Static assets — cache-first, update in background.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // HTML navigations — network-first so Adam always gets the latest UI,
  // fall back to cache, then to the offline page.
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          return (
            offline ||
            new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } })
          );
        }),
    );
  }
});
