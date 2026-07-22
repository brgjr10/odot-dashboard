// Minimal offline shell caching (no runtime caching of camera images).
const CACHE = "odot-dashboard-shell-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./cameras.js",
  "./weather.js",
  "./defaults.js",
  "./storage.js",
  "./time.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached)));
});