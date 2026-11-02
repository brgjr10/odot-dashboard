// Minimal offline shell caching (no runtime caching of camera images).
// ASSETS must match what index.html actually requests; the previous list pointed
// at the orphaned module tree and omitted ./bundle.js, the only script the page
// loads. CACHE carries the shell version so a new bundle evicts the old shell
// instead of being served from it forever.
const CACHE = "odot-dashboard-shell-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./bundle.js",
  "./manifest.webmanifest",
  "./icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(ASSETS).catch((err) => {
        console.warn("[odot-sw] shell precache incomplete; continuing online-only:", err);
      })
    )
  );
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

  // Network-first: this is a dashboard that gets pulled and refreshed, so a
  // cache-first shell would serve a stale UI after an update.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy)).catch((err) => {
          console.warn("[odot-sw] could not update the shell cache:", err);
        });
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          throw new Error(`[odot-sw] offline and ${event.request.url} is not cached`);
        })
      )
  );
});