const STATIC_CACHE = "ca-static-v3";
const IMG_CACHE = "ca-img-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) =>
        c.addAll([
          "/cazandoando/",
          "/cazandoando/style.css",
          "/cazandoando/script.js",
          "/cazandoando/data/products.json",
          "/cazandoando/assets/CazandoAndo.webp",
          "/cazandoando/assets/logo.webp",
          "/cazandoando/assets/camuflado.webp",
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
  const req = e.request;
  const url = new URL(req.url);

  // Cache-first para imágenes
  if (/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const resp = await fetch(req, { cache: "no-store" });
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      })
    );
    return;
  }

  // Stale-while-revalidate para CSS/JS/JSON
  if (/\.(css|js|json)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetching = fetch(req).then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        });
        return cached || fetching;
      })
    );
  }
});
