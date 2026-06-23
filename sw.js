// Service Worker — Sinaloa Construcciones PWA
// Versión: 1.0.0

const CACHE_NAME = "sinaloa-obras-v1";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
];

// Instalar y cachear recursos estáticos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Si algún asset externo falla, no bloquear instalación
        return cache.add("./index.html");
      });
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: Network First para Firebase, Cache First para assets
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Firebase y APIs externas → siempre red (no cachear datos dinámicos)
  if (url.includes("firebase") || url.includes("firebaseio") || url.includes("googleapis")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets estáticos → Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cachear recursos nuevos válidos
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback al index.html si no hay red y no está en caché
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
