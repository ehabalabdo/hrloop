// ============================================================
// HR Loop — Service Worker (DISABLED)
// Unregisters itself and clears all caches to fix stale pages
// ============================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
    .then(() => {
      // Tell all pages to reload
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
    })
  );
});

// No fetch handler — go straight to network
