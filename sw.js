// PARCHXA service worker.
// Strategy: network-first for HTML navigations (so pages stay fresh), cache-first for static
// assets (JS/CSS/icons). Bump VERSION to invalidate old caches on deploy.
const VERSION = "parchxa-v16";

const ASSETS = [
  "./",
  "index.html",
  "invoice.html",
  "quote.html",
  "calculators.html",
  "money.html",
  "trading.html",
  "chart.html",
  "terminal.html",
  "math.html",
  "student.html",
  "memorial.html",
  "convert.html",
  "rates.html",
  "profit.html",
  "privacy.html",
  "terms.html",
  "offline.html",
  "css/main.css",
  "css/pro.css",
  "css/landing.css",
  "css/print.css",
  "css/terminal.css",
  "js/app.js",
  "js/site.js",
  "js/config.js",
  "js/nav.js",
  "js/theme.js",
  "js/icons.js",
  "js/home.js",
  "js/landing.js",
  "js/sanitize.js",
  "js/analytics.js",
  "js/command-palette.js",
  "js/sharecard.js",
  "js/products.js",
  "js/affiliates.js",
  "js/quant.js",
  "js/storage.js",
  "js/invoice.js",
  "js/quote.js",
  "js/calculators.js",
  "js/advanced.js",
  "js/math.js",
  "js/trading.js",
  "js/money.js",
  "js/student.js",
  "js/chart.js",
  "js/convert.js",
  "js/rates.js",
  "js/profit.js",
  "js/memorial.js",
  "js/invoice-dashboard.js",
  "js/terminal/main.js",
  "js/terminal/engine.js",
  "js/terminal/market-data.js",
  "js/terminal/indicators.js",
  "js/terminal/drawings.js",
  "js/terminal/store.js",
  "css/calc.css",
  "js/registry.js",
  "js/search.js",
  "js/directory-ui.js",
  "js/data/tool-families.js",
  "js/data/app-tools.js",
  "js/calc/format.js",
  "js/calc/math.js",
  "js/calc/catalog.js",
  "js/calc/runner.js",
  "js/calc/directory.js",
  "js/calc/data/finance.js",
  "js/calc/data/business.js",
  "js/calc/data/monetization.js",
  "js/calc/data/trading.js",
  "js/calc/data/math.js",
  "js/calc/data/general.js",
  "directory.html",
  "css/mathlab.css",
  "js/mathengine.js",
  "js/mathlab.js",
  "vendor/nerdamer.min.js",
  "vendor/katex/katex.min.js",
  "vendor/katex/katex.min.css",
  "icons/icon.svg",
  "icons/og.png",
  "manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Add assets individually so one 404 cannot abort the whole install.
    await Promise.allSettled(ASSETS.map((asset) => cache.add(new Request(asset, { cache: "reload" }))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  const isHtml = req.mode === "navigate" || req.destination === "document";
  if (isHtml) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || (await caches.match("offline.html")) || (await caches.match("index.html"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200 && fresh.type === "basic") {
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});
