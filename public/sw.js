/// <reference lib="webworker" />

// ============================================================
// HR Loop — Service Worker
// Enables offline loading of the app shell
// Caches static assets on install, serves from cache first,
// falls back to network. Never caches API/server-action calls.
// ============================================================

const CACHE_NAME = "hrloop-v1";
const STATIC_ASSETS = ["/", "/attendance", "/dashboard"];

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API routes or server actions (POST to app routes)
  if (
    url.pathname.startsWith("/api/") ||
    request.method === "POST" ||
    url.pathname.includes("_next/data")
  ) {
    return;
  }

  // Cache-first for static assets, network-first for pages
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)
  ) {
    // Static assets: cache-first
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  } else {
    // Pages: network-first, fallback to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
        .then((r) => r || new Response("Offline", { status: 503 }))
    );
  }
});
