const STATIC_CACHE = "ca-static-v4";
const IMG_CACHE = "ca-img-v4";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) =>
      c.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./data/products.json",
        // agrega acá SOLO archivos que existan realmente
        // './assets/logo.webp',
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![STATIC_CACHE, IMG_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Imágenes: cache-first
  if (/\.(?:png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const resp = await fetch(request, { cache: "no-store" });
        if (resp.ok) cache.put(request, resp.clone());
        return resp;
      })
    );
    return;
  }

  // CSS/JS/JSON: stale-while-revalidate simple
  if (/\.(?:css|js|json)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((resp) => {
          if (resp.ok) cache.put(request, resp.clone());
          return resp;
        });
        return cached || fetchPromise;
      })
    );
  }
});
