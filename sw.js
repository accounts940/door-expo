// SELMEX Expo CRM service worker: app shell offline + fast loads.
// Supabase / AI calls are never cached (always live data).
const V = "selmex-expo-v6";
const SHELL = ["./", "index.html", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);

  // Library scripts from the CDN: cache-first (they are version-pinned)
  if (u.hostname === "cdn.jsdelivr.net" || u.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(
      caches.match(r).then((m) => m || fetch(r).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); return res; }))
    );
    return;
  }

  // Everything else cross-origin (Supabase, AI function, storage): do not touch
  if (u.origin !== location.origin) return;

  // Our own files: network first so updates arrive, cache as offline fallback
  e.respondWith(
    fetch(r)
      .then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match("index.html")))
  );
});
