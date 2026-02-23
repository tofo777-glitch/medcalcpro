// MedCalculationPro Service Worker — offline cache
const CACHE_NAME = "medcalcpro-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      return res;
    }).catch(() => {
      return caches.match(e.request).then((cached) => {
        return cached || new Response("Offline", { status: 503 });
      });
    })
  );
});
