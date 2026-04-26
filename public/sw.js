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
// v2.19.1: stats clarity + per-vehicle thresholds + header alignment.
//
// (a) Hamburger v headeru sjednocen na w-9 h-9 (čtverec) jako Accent +
//     Theme toggle. Bylo px-2 py-1.5 → výška 28 px, ostatní 36 px →
//     hamburger vyčníval. Adam: "hamburger je opět mimo ostatní".
//
// (b) Ø tankování / měsíc / rok / km — přepočítané z lifetime data místo
//     extrapolace okna. Adam viděl "2,34 tankování / měsíc" když měl
//     filter Měsíc + 2 fill-upy: math byl 2 / (26d/30.4) = 2.34. Teď
//     karty říkají "jak často obecně tankuju", nezávislé na filtru.
//
// (c) Nové stat tile (jen per-vehicle): "Spotřeba (30 dní)" = sezónní
//     trend, "Posl. tankování" = consumption_l_per_100km posledního
//     fill-upu. User feedback: "okamzita spotreba od posledniho
//     tankovani — uzitecny udaj: hned vidis, zes minule vzal
//     nekvalitni/velmi kvalitni phm".
//
// (d) Per-vehicle consumption thresholds. Settings vehicle → "Dobrá ≤"
//     a "Špatná ≥" inputy v l/100. Když nastaveny, hard cutoff barvení
//     v seznamu tankování (zelená pod good, červená nad bad). Když
//     prázdné, fallback na ±10/15 % z dlouhodobého průměru. Migrace
//     v2_19_1_consumption_thresholds přidala 2 nullable sloupce do
//     vehicles.
const CACHE_VERSION = "fuellog-v2.19.1";
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
