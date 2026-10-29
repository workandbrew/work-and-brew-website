/* Work & Brew service worker.
   - Pages: network first, falls back to the cached page, then to /offline.html.
   - Built assets, images and fonts: cache first (they carry hashes or rarely change).
   - Never caches: /api/*, Supabase, Google Apps Script, map tiles. */
const VERSION = "wb-v1";
const SHELL = ["/offline.html", "/bear-black.png", "/site.webmanifest", "/favicon-bear.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const skip = (url) =>
  url.origin !== self.location.origin ||
  url.pathname.startsWith("/api/") ||
  url.pathname === "/sw.js";

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (skip(url)) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline.html")))
    );
    return;
  }

  const isAsset = url.pathname.startsWith("/assets/") || /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css|js)$/i.test(url.pathname);
  if (!isAsset) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
