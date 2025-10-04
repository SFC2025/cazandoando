self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open("ca-v1")
      .then((c) =>
        c.addAll([
          "/",
          "/style.css",
          "/script.js",
          "/data/products.json",
          "/assets/CazandoAndo.webp",
        ])
      )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
