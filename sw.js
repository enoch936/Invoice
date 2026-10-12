// PARCHXA service worker: cache-first for same-origin static assets, network-first for HTML. Bump VERSION to refresh.
const VERSION = "parchxa-v3";
const ASSETS = ["./", "index.html", "invoice.html", "quote.html", "calculators.html", "money.html", "trading.html", "chart.html", "memorial.html", "convert.html", "rates.html", "student.html", "privacy.html", "terms.html", "css/main.css", "css/pro.css", "css/print.css", "js/app.js", "js/site.js", "js/config.js", "js/affiliates.js", "js/quant.js", "js/storage.js", "js/invoice.js", "js/quote.js", "js/calculators.js", "js/advanced.js", "js/trading.js", "js/money.js", "js/student.js", "js/chart.js", "js/convert.js", "js/rates.js", "js/memorial.js", "js/invoice-dashboard.js", "icons/icon.svg", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isHtml = req.mode === "navigate" || req.destination === "document";
  e.respondWith(isHtml
    ? fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return r; }).catch(() => caches.match(req).then((m) => m || caches.match("index.html")))
    : caches.match(req).then((m) => m || fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return r; })));
});
