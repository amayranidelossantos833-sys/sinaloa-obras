// Service Worker — Sinaloa Construcciones
// VERSIÓN: cambia este número cada vez que subas cambios a GitHub
// Eso fuerza al navegador a descargar todo de nuevo
const VERSION    = "v4";
const CACHE_NAME = "sinaloa-obras-" + VERSION;

// Solo cacheamos el HTML principal y el manifiesto
// Chart.js y Firebase siempre van a la red
const CACHE_ASSETS = [
  "./index.html",
  "./manifest.json"
];

// INSTALAR: guarda assets en caché nueva
self.addEventListener("install", event => {
  // skipWaiting fuerza activación inmediata sin esperar a cerrar pestañas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_ASSETS)).catch(() => {})
  );
});

// ACTIVAR: borra TODOS los cachés viejos inmediatamente
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log("[SW] Borrando caché viejo:", k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // toma control de todas las pestañas abiertas
  );
});

// FETCH: estrategia según el tipo de recurso
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Firebase, Google APIs, CDNs externos → SIEMPRE red, nunca caché
  if (
    url.includes("firebase") ||
    url.includes("firebaseio.com") ||
    url.includes("googleapis.com") ||
    url.includes("gstatic.com") ||
    url.includes("cdnjs.cloudflare.com") ||
    url.includes("raw.githubusercontent.com")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html → Network First: intenta red primero, caché solo si falla
  if (url.includes("index.html") || event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Si la red responde, actualiza el caché con la versión más reciente
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match("./index.html")) // si no hay red, usa caché
    );
    return;
  }

  // Resto (manifest, iconos) → Cache First
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Escucha mensajes desde la app para forzar actualización
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
